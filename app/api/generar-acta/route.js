// API Route de Next.js que corre en el SERVIDOR
// Genera el acta de entrega STI-FOR-001 en multiples paginas
 
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
 
export async function POST(request) {
  try {
    const datos = await request.json();
 
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
 
    // Dimensiones pagina carta
    const PW = 612;
    const PH = 792;
    const ML = 35;  // margen izquierdo
    const MR = 577; // margen derecho
    const MT = 750; // margen superior
    const MB = 50;  // margen inferior
    const AW = MR - ML; // ancho total disponible
 
    // Colores
    const negro     = rgb(0, 0, 0);
    const blanco    = rgb(1, 1, 1);
    const grisClaro = rgb(0.88, 0.88, 0.88);
    const azul      = rgb(0.07, 0.18, 0.38);
 
    // --- HELPERS ---
    // Creamos la primera pagina
    let page = pdfDoc.addPage([PW, PH]);
    let y = MT;
 
    // Agrega una nueva pagina y resetea y
    function nuevaPagina() {
      page = pdfDoc.addPage([PW, PH]);
      y = MT;
    }
 
    // Verifica si hay espacio, si no crea nueva pagina
    function checkEspacio(espacioNecesario) {
      if (y - espacioNecesario < MB) nuevaPagina();
    }
 
    function txt(contenido, x, yPos, { f = fontRegular, s = 8, c = negro } = {}) {
      const val = contenido === null || contenido === undefined ? "" : String(contenido);
      if (val) page.drawText(val, { x, y: yPos, size: s, font: f, color: c });
    }
 
    function txtC(contenido, x, yPos, ancho, { f = fontRegular, s = 8, c = negro } = {}) {
      const val = String(contenido || "");
      if (!val) return;
      const w = f.widthOfTextAtSize(val, s);
      page.drawText(val, { x: x + (ancho - w) / 2, y: yPos, size: s, font: f, color: c });
    }
 
    function rec(x, yPos, w, h, color) {
      page.drawRectangle({ x, y: yPos, width: w, height: h, color });
    }
 
    function recB(x, yPos, w, h, bc = negro, bw = 0.5, fill = null) {
      if (fill) page.drawRectangle({ x, y: yPos, width: w, height: h, color: fill });
      page.drawRectangle({ x, y: yPos, width: w, height: h, borderColor: bc, borderWidth: bw });
    }
 
    function lin(x1, yPos, x2, c = negro, t = 0.5) {
      page.drawLine({ start: { x: x1, y: yPos }, end: { x: x2, y: yPos }, thickness: t, color: c });
    }
 
    function linV(x, y1, y2, c = negro, t = 0.5) {
      page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: t, color: c });
    }
 
    // Dibuja texto multilinea y retorna la y final
    function multilinea(contenido, x, yPos, maxW, { f = fontRegular, s = 8, c = negro, lh = 12 } = {}) {
      const palabras = String(contenido || "").split(" ");
      let lineaActual = "";
      let yActual = yPos;
      palabras.forEach((p) => {
        const prueba = lineaActual ? lineaActual + " " + p : p;
        if (f.widthOfTextAtSize(prueba, s) > maxW) {
          if (lineaActual) {
            page.drawText(lineaActual, { x, y: yActual, size: s, font: f, color: c });
            yActual -= lh;
            lineaActual = p;
          } else {
            lineaActual = p;
          }
        } else {
          lineaActual = prueba;
        }
      });
      if (lineaActual) {
        page.drawText(lineaActual, { x, y: yActual, size: s, font: f, color: c });
        yActual -= lh;
      }
      return yActual;
    }
 
    // Dibuja el encabezado del documento (se repite en cada pagina)
    function dibujarEncabezado() {
      const hE = 22;
      // Celda logo
      recB(ML, y - hE, 65, hE, negro, 0.8);
      txtC("LOGO", ML, y - 14, 65, { f: fontBold, s: 7 });
      // Celda titulo
      recB(ML + 65, y - hE, 255, hE, negro, 0.8, grisClaro);
      txtC("FORMATO DE ENTREGA DE EQUIPOS", ML + 65, y - 14, 255, { f: fontBold, s: 9 });
      // Celda codigo
      recB(ML + 320, y - hE, 85, hE, negro, 0.8);
      txt("CÓDIGO", ML + 325, y - 9, { f: fontBold, s: 6.5 });
      txt("STI-FOR-001", ML + 323, y - 17, { s: 7 });
      // Celda version
      recB(ML + 405, y - hE, 55, hE, negro, 0.8);
      txt("VERSIÓN", ML + 410, y - 9, { f: fontBold, s: 6.5 });
      txt("1.0", ML + 422, y - 17, { s: 7 });
      // Celda STI
      recB(ML + 460, y - hE, AW - 460, hE, negro, 0.8, grisClaro);
      txtC("STI", ML + 460, y - 14, AW - 460, { f: fontBold, s: 11 });
      y -= hE + 10;
    }
 
    // Dibuja una fila de encabezado de seccion (fondo azul, texto blanco)
    function seccion(titulo, alto = 16) {
      checkEspacio(alto + 5);
      rec(ML, y - alto, AW, alto, azul);
      recB(ML, y - alto, AW, alto, negro, 0.8);
      txtC(titulo, ML, y - alto + 4, AW, { f: fontBold, s: 8.5, c: blanco });
      y -= alto;
    }
 
    // Dibuja una fila de datos con celdas
    function fila(celdas, alto = 15) {
      checkEspacio(alto);
      recB(ML, y - alto, AW, alto, negro, 0.5);
      let xActual = ML;
      celdas.forEach(({ ancho, label, valor, esLabel = false }) => {
        if (xActual > ML) linV(xActual, y, y - alto, negro, 0.5);
        if (label) {
          txt(label, xActual + 3, y - alto + 4, { f: fontBold, s: 7.5 });
        }
        if (valor !== undefined && valor !== null) {
          const xValor = label ? xActual + (fontBold.widthOfTextAtSize(label, 7.5)) + 6 : xActual + 3;
          txt(String(valor), xValor, y - alto + 4, { s: 7.5 });
        }
        if (esLabel) {
          rec(xActual, y - alto, ancho, alto, grisClaro);
          recB(xActual, y - alto, ancho, alto, negro, 0.5);
          txtC(label || "", xActual, y - alto + 4, ancho, { f: fontBold, s: 7.5 });
        }
        xActual += ancho;
      });
      y -= alto;
    }
 
    // ============================================================
    // PAGINA 1: ENCABEZADO + INFORMACION GENERAL + DESCRIPCION EQUIPO
    // ============================================================
    dibujarEncabezado();
 
    // --- INFORMACION GENERAL ---
    txt("INFORMACIÓN GENERAL", ML, y, { f: fontBold, s: 10 });
    y -= 14;
 
    // Responsable de la entrega
    seccion("RESPONSABLE DE LA ENTREGA");
    recB(ML, y - 15, AW, 15, negro, 0.5);
    linV(ML + 55, y, y - 15, negro, 0.5);
    linV(ML + 185, y, y - 15, negro, 0.5);
    linV(ML + 285, y, y - 15, negro, 0.5);
    txt("Ubicación", ML + 3, y - 11, { f: fontBold, s: 7.5 });
    txt(datos.ciudad_entrega || "", ML + 58, y - 11, { s: 7.5 });
    txt("Fecha entrega", ML + 188, y - 11, { f: fontBold, s: 7.5 });
    txt(datos.fecha_entrega || "", ML + 288, y - 11, { s: 7.5 });
    y -= 15;
 
    recB(ML, y - 15, AW, 15, negro, 0.5);
    linV(ML + 80, y, y - 15, negro, 0.5);
    txt("Entregado por", ML + 3, y - 11, { f: fontBold, s: 7.5 });
    txt(datos.entregado_por || "", ML + 83, y - 11, { s: 7.5 });
    y -= 15 + 8;
 
    // Informacion del usuario
    seccion("INFORMACIÓN DEL USUARIO");
    recB(ML, y - 15, AW, 15, negro, 0.5);
    linV(ML + 55, y, y - 15, negro, 0.5);
    linV(ML + 265, y, y - 15, negro, 0.5);
    linV(ML + 305, y, y - 15, negro, 0.5);
    txt("Usuario", ML + 3, y - 11, { f: fontBold, s: 7.5 });
    txt(datos.usuario_nombre || "", ML + 58, y - 11, { s: 7.5 });
    txt("Cargo", ML + 268, y - 11, { f: fontBold, s: 7.5 });
    txt(datos.usuario_cargo || "", ML + 308, y - 11, { s: 7.5 });
    y -= 15;
 
    recB(ML, y - 15, AW, 15, negro, 0.5);
    linV(ML + 70, y, y - 15, negro, 0.5);
    linV(ML + 95, y, y - 15, negro, 0.5);
    linV(ML + 205, y, y - 15, negro, 0.5);
    linV(ML + 245, y, y - 15, negro, 0.5);
    txt("Identificación", ML + 3, y - 11, { f: fontBold, s: 7.5 });
    txt("C.C.", ML + 73, y - 11, { s: 7.5 });
    txt(datos.usuario_cedula || "", ML + 98, y - 11, { s: 7.5 });
    txt("Área", ML + 208, y - 11, { f: fontBold, s: 7.5 });
    txt(datos.usuario_area || "", ML + 248, y - 11, { s: 7.5 });
    y -= 15;
 
    recB(ML, y - 15, AW, 15, negro, 0.5);
    linV(ML + 110, y, y - 15, negro, 0.5);
    txt("Correo corporativo", ML + 3, y - 11, { f: fontBold, s: 7.5 });
    txt(datos.usuario_correo || "", ML + 113, y - 11, { s: 7.5 });
    y -= 15 + 10;
 
    // --- DESCRIPCION DEL EQUIPO ---
    txt("DESCRIPCIÓN DEL EQUIPO", ML, y, { f: fontBold, s: 10 });
    y -= 14;
 
    seccion("INFORMACIÓN DEL DISPOSITIVO");
 
    const hFila = 15;
    const sep = ML + 275; // separador columnas
    const lw = 60;  // ancho labels col izquierda
    const rw = 85;  // ancho labels col derecha
 
    const filasDispositivo = [
      ["Tipo",         datos.tipo || "",              "Procesador",     datos.procesador || ""],
      ["Marca",        datos.marca || "",             "Memoria RAM",    datos.memoria_ram || ""],
      ["Modelo",       datos.modelo || "",            "Almacenamiento", datos.almacenamiento || ""],
      ["Serial",       datos.serial || "",            "IMEI 1",         datos.imei_1 || ""],
      ["Hostname",     datos.hostname || "",          "IMEI 2",         datos.imei_2 || ""],
      ["S.O.",         datos.sistema_operativo || "", "Usuario anterior:", datos.usuario_anterior || ""],
      ["Versión S.O.", datos.version_so || "",        "",               ""],
    ];
 
    filasDispositivo.forEach(([l1, v1, l2, v2]) => {
      checkEspacio(hFila);
      recB(ML, y - hFila, AW, hFila, negro, 0.5);
      linV(sep, y, y - hFila, negro, 0.5);
      txt(l1, ML + 3, y - hFila + 4, { f: fontBold, s: 7.5 });
      txt(v1, ML + lw, y - hFila + 4, { s: 7.5 });
      if (l2) {
        txt(l2, sep + 3, y - hFila + 4, { f: fontBold, s: 7.5 });
        txt(v2, sep + rw, y - hFila + 4, { s: 7.5 });
      }
      y -= hFila;
    });
 
    y -= 8;
 
    // --- ELEMENTOS ADICIONALES ---
    seccion("INFORMACIÓN DE ELEMENTOS ADICIONALES");
 
    // Encabezado tabla perifericos
    const colP = [ML, ML + 120, ML + 270, ML + 390];
    const ancP = [120, 150, 120, AW - 355];
    rec(ML, y - hFila, AW, hFila, grisClaro);
    recB(ML, y - hFila, AW, hFila, negro, 0.5);
    ["Periféricos", "Serial", "Marca", "Modelo"].forEach((t, i) => {
      if (i > 0) linV(colP[i], y, y - hFila, negro, 0.5);
      txtC(t, colP[i], y - hFila + 4, ancP[i], { f: fontBold, s: 7.5 });
    });
    y -= hFila;
 
    // Tipos fijos de perifericos
    const tiposFijos = ["Mouse", "Teclado", "Monitor", "Cargador", "Audífonos"];
    const perifericos = datos.perifericos || [];
 
    const filasPerif = [
      ...tiposFijos.map((tipo) => {
        const p = perifericos.find((p) =>
          p.tipo === tipo || p.tipo === tipo.replace("í", "i")
        );
        return {
          tipo,
          serial: p?.serial || "N/A",
          marca: p?.marca || "N/A",
          modelo: p?.modelo || "N/A",
        };
      }),
      ...perifericos
        .filter((p) => !tiposFijos.includes(p.tipo) && !tiposFijos.map(t => t.replace("í","i")).includes(p.tipo))
        .map((p) => ({
          tipo: p.tipo,
          serial: p.serial || "N/A",
          marca: p.marca || "N/A",
          modelo: p.modelo || "N/A",
        })),
    ];
 
    filasPerif.forEach((fila) => {
      checkEspacio(hFila);
      recB(ML, y - hFila, AW, hFila, negro, 0.5);
      colP.forEach((x, i) => { if (i > 0) linV(x, y, y - hFila, negro, 0.5); });
      txt(fila.tipo,   colP[0] + 3, y - hFila + 4, { s: 7.5 });
      txt(fila.serial, colP[1] + 3, y - hFila + 4, { s: 7.5 });
      txt(fila.marca,  colP[2] + 3, y - hFila + 4, { s: 7.5 });
      txt(fila.modelo, colP[3] + 3, y - hFila + 4, { s: 7.5 });
      y -= hFila;
    });
 
    // Fila Software
    checkEspacio(hFila);
    rec(ML, y - hFila, AW, hFila, grisClaro);
    recB(ML, y - hFila, AW, hFila, negro, 0.5);
    txt("Software", ML + 3, y - hFila + 4, { f: fontBold, s: 7.5 });
    y -= hFila;
 
    // Licencia Office
    checkEspacio(hFila);
    recB(ML, y - hFila, AW, hFila, negro, 0.5);
    linV(ML + 100, y, y - hFila, negro, 0.5);
    txt("Licencia Office", ML + 3, y - hFila + 4, { f: fontBold, s: 7.5 });
    txt(datos.licencia_office || "", ML + 103, y - hFila + 4, { s: 7.5 });
    y -= hFila;
 
    // Antivirus
    checkEspacio(hFila);
    recB(ML, y - hFila, AW, hFila, negro, 0.5);
    linV(ML + 100, y, y - hFila, negro, 0.5);
    txt("Antivirus", ML + 3, y - hFila + 4, { f: fontBold, s: 7.5 });
    txt(datos.antivirus || "", ML + 103, y - hFila + 4, { s: 7.5 });
    y -= hFila;
 
    // Software Corporativo
    checkEspacio(hFila);
    recB(ML, y - hFila, AW, hFila, negro, 0.5);
    linV(ML + 100, y, y - hFila, negro, 0.5);
    txt("Software Corporativo", ML + 3, y - hFila + 4, { f: fontBold, s: 7.5 });
    txt(datos.software_corporativo || "", ML + 103, y - hFila + 4, { s: 7.5 });
    y -= hFila + 10;
 
    // ============================================================
    // CONDICIONES DE USO (puede ir en pagina 2)
    // ============================================================
    checkEspacio(120);
    txt("CONDICIONES DE USO", ML, y, { f: fontBold, s: 10 });
    y -= 14;
    txt("El empleado que recibe este equipo se compromete a:", ML, y, { s: 8 });
    y -= 14;
 
    const condiciones = [
      "No retirar o adicionar periféricos o dispositivos internos o externos; no desarmar o destapar el equipo.",
      "No instalar software diferente al autorizado, el departamento de STI es el único autorizado en proporcionar el software y su respectiva licencia.",
      "Informar al jefe inmediato en caso de pérdida o robo, en tal caso el empleado asume el 100% del valor del deducible del seguro.",
      "Informar de manera oportuna al jefe inmediato y al departamento de STI sobre los daños presentados al equipo.",
      "No utilizar el equipo para realizar trabajos ajenos a TRIENERGY o almacenar información no relacionada con los asuntos de esta.",
      "Utilizar según las políticas de seguridad de la información.",
      "Respecto al derecho de la Privacidad de la Información, se indica que TRIENERGY puede hacer uso de las claves de acceso para la investigación o búsqueda de archivos.",
      "Cuando requiera algún tipo de servicio relacionado con el funcionamiento del equipo, requerirlo únicamente con el departamento de STI.",
      "Devolver el equipo al departamento de STI por motivo de cambio de equipo o retiro de la Empresa, en las mismas condiciones especificadas en esta Acta.",
      "Garantizar que únicamente el personal autorizado por el departamento de STI puede adicionar o retirar componentes al equipo.",
      "Cualquier modificación a la configuración del equipo descrita en esta Acta, requiere la modificación o anulación del Acta y la generación de una nueva Acta de Entrega donde se reflejen los cambios.",
    ];
 
    condiciones.forEach((c) => {
      // Calculamos el espacio que necesita esta condicion
      const lineasEstimadas = Math.ceil((c.length * 6) / (AW - 15));
      const espacioNecesario = lineasEstimadas * 11 + 5;
      checkEspacio(espacioNecesario);
      y = multilinea("•  " + c, ML + 5, y, AW - 15, { s: 7.5, lh: 11 });
      y -= 4;
    });
 
    y -= 10;
 
    // ============================================================
    // ACEPTACION Y AUTORIZACION
    // ============================================================
    checkEspacio(120);
    txt("ACEPTACIÓN Y AUTORIZACIÓN", ML, y, { f: fontBold, s: 10 });
    y -= 14;
 
    const textoAcep = "Declaro haber recibido el equipo aquí descrito a entera satisfacción, conocer las CONDICIONES DE USO y aceptarlas; en consecuencia, me hago responsable del mismo durante el tiempo que esté a mi cargo. Si llegado el momento de la devolución, faltara alguno de sus componentes o estuviera deteriorado o dañado por causas diferentes al uso normal, expresamente autorizo a la Empresa para que descuente su valor de lo que se me adeude por concepto de salarios, prestaciones sociales, vacaciones, indemnizaciones, auxilios, bonificaciones o cualquier otro pago al que tuviera derecho. En caso de hurto calificado debo reportar ante el departamento de TI y presentar carta de lo sucedido y denuncio ante la Fiscalía. De la misma forma, entiendo que la violación a cualquiera de las CONDICIONES DE USO contenidas en este documento constituye una falta grave que producirá las consecuencias previstas en el reglamento interno de trabajo.";
    y = multilinea(textoAcep, ML, y, AW, { s: 8, lh: 12 });
    y -= 15;
 
    checkEspacio(80);
    txt("Firma Aceptación,", ML, y, { f: fontBold, s: 8.5 });
    y -= 40;
    lin(ML, y, ML + 200, negro, 0.8);
    y -= 12;
    txt("C.C. " + (datos.usuario_cedula || ""), ML, y, { s: 8 });
    y -= 14;
    txt(datos.usuario_nombre || "", ML, y, { f: fontBold, s: 8.5 });
    y -= 20;
 
    // ============================================================
    // PIE DE PAGINA
    // ============================================================
    checkEspacio(35);
    const hPie = 28;
    const cPie = AW / 3;
    rec(ML, y - hPie, AW, hPie, grisClaro);
    recB(ML, y - hPie, AW, hPie, negro, 0.8);
    linV(ML + cPie,     y, y - hPie, negro, 0.5);
    linV(ML + cPie * 2, y, y - hPie, negro, 0.5);
 
    // Celda 1
    txt("Elaborado por:", ML + 4, y - 9, { f: fontBold, s: 7 });
    txt("Sistemas & TI", ML + 4 + fontBold.widthOfTextAtSize("Elaborado por: ", 7), y - 9, { f: fontBold, s: 7 });
    txt("Fecha: 20/10/2025", ML + 4, y - 21, { s: 6.5 });
 
    // Celda 2
    txt("Revisado por:", ML + cPie + 4, y - 9, { f: fontBold, s: 7 });
    txt("Jefe de Sistemas & TI", ML + cPie + 4 + fontBold.widthOfTextAtSize("Revisado por: ", 7), y - 9, { f: fontBold, s: 7 });
    txt("Fecha de revisión: 20/10/2025", ML + cPie + 4, y - 21, { s: 6.5 });
 
    // Celda 3
    txt("Aprobado por:", ML + cPie * 2 + 4, y - 9, { f: fontBold, s: 7 });
    txt("Jefe de Sistemas & TI", ML + cPie * 2 + 4 + fontBold.widthOfTextAtSize("Aprobado por: ", 7), y - 9, { f: fontBold, s: 7 });
    txt("Fecha de aprobación: 20/10/2025", ML + cPie * 2 + 4, y - 21, { s: 6.5 });
 
    // ============================================================
    // GENERAMOS EL PDF
    // ============================================================
    const pdfBytes = await pdfDoc.save();
 
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="acta_entrega_${(datos.usuario_nombre || "equipo").replace(/ /g, "_")}.pdf"`,
      },
    });
 
  } catch (error) {
    console.error("Error generando acta:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}