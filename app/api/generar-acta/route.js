// API Route de Next.js que corre en el SERVIDOR
// Genera el acta de entrega STI-FOR-001 con logo, colores corporativos y multipagina
 
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
 
// Logo de TRIENERGY en base64 incrustado directamente
const LOGO_BASE64 = "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";
 
export async function POST(request) {
  try {
    const datos = await request.json();
 
    const pdfDoc = await PDFDocument.create();
    const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
 
    // Incrustamos el logo PNG
    const logoBytes = Uint8Array.from(atob(LOGO_BASE64), c => c.charCodeAt(0));
    const logoImg   = await pdfDoc.embedPng(logoBytes);
    const logoDims  = logoImg.scale(0.30); // Escala el logo para que quepa en el encabezado
 
    // Dimensiones pagina carta
    const PW = 612, PH = 792;
    const ML = 35, MR = 577, MT = 750, MB = 55;
    const AW = MR - ML;
 
    // Colores corporativos TRIENERGY
    const negro     = rgb(0, 0, 0);
    const blanco    = rgb(1, 1, 1);
    const rojo      = rgb(0.78, 0.08, 0.08);   // Rojo corporativo
    const grisOsc   = rgb(0.35, 0.35, 0.35);   // Gris oscuro para texto secundario
    const grisMed   = rgb(0.75, 0.75, 0.75);   // Gris medio para fondos alternos
    const grisClaro = rgb(0.92, 0.92, 0.92);   // Gris claro para encabezados de tabla
 
    let page = pdfDoc.addPage([PW, PH]);
    let y = MT;
 
    function nuevaPagina() {
      page = pdfDoc.addPage([PW, PH]);
      y = MT;
      dibujarEncabezado(); // Repetimos el encabezado en cada pagina
    }
 
    function checkEspacio(necesario) {
      if (y - necesario < MB) nuevaPagina();
    }
 
    function txt(val, x, yp, { f = fontRegular, s = 8, c = negro } = {}) {
      const v = val === null || val === undefined ? "" : String(val);
      if (v) page.drawText(v, { x, y: yp, size: s, font: f, color: c });
    }
 
    function txtC(val, x, yp, ancho, { f = fontRegular, s = 8, c = negro } = {}) {
      const v = String(val || "");
      if (!v) return;
      const w = f.widthOfTextAtSize(v, s);
      page.drawText(v, { x: x + (ancho - w) / 2, y: yp, size: s, font: f, color: c });
    }
 
    function rec(x, yp, w, h, color) {
      page.drawRectangle({ x, y: yp, width: w, height: h, color });
    }
 
    function recB(x, yp, w, h, bc = negro, bw = 0.5, fill = null) {
      if (fill) page.drawRectangle({ x, y: yp, width: w, height: h, color: fill });
      page.drawRectangle({ x, y: yp, width: w, height: h, borderColor: bc, borderWidth: bw });
    }
 
    function lin(x1, yp, x2, c = negro, t = 0.5) {
      page.drawLine({ start: { x: x1, y: yp }, end: { x: x2, y: yp }, thickness: t, color: c });
    }
 
    function linV(x, y1, y2, c = negro, t = 0.5) {
      page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: t, color: c });
    }
 
    function multilinea(contenido, x, yp, maxW, { f = fontRegular, s = 8, c = negro, lh = 12 } = {}) {
      const palabras = String(contenido || "").split(" ");
      let lineaActual = "";
      let yActual = yp;
      palabras.forEach((p) => {
        const prueba = lineaActual ? lineaActual + " " + p : p;
        if (f.widthOfTextAtSize(prueba, s) > maxW) {
          if (lineaActual) {
            page.drawText(lineaActual, { x, y: yActual, size: s, font: f, color: c });
            yActual -= lh;
            lineaActual = p;
          } else { lineaActual = p; }
        } else { lineaActual = prueba; }
      });
      if (lineaActual) {
        page.drawText(lineaActual, { x, y: yActual, size: s, font: f, color: c });
        yActual -= lh;
      }
      return yActual;
    }
 
    // ============================================================
    // ENCABEZADO - Logo + Titulo + Codigo/Version/STI
    // ============================================================
    function dibujarEncabezado() {
      const hE = 36;
 
      // Borde exterior del encabezado
      recB(ML, y - hE, AW, hE, negro, 0.8);
 
      // Celda logo (fondo blanco, logo centrado)
      recB(ML, y - hE, 90, hE, negro, 0.8, blanco);
      page.drawImage(logoImg, {
        x: ML + (90 - logoDims.width) / 2,
        y: y - hE + (hE - logoDims.height) / 2,
        width: logoDims.width,
        height: logoDims.height,
      });
 
      // Celda titulo (fondo rojo corporativo)
      rec(ML + 90, y - hE, 250, hE, rojo);
      recB(ML + 90, y - hE, 250, hE, negro, 0.8);
      txtC("FORMATO DE ENTREGA DE EQUIPOS", ML + 90, y - hE / 2 - 4, 250, { f: fontBold, s: 9, c: blanco });
 
      // Celda codigo
      recB(ML + 340, y - hE, 80, hE, negro, 0.8, grisClaro);

      // Línea divisoria horizontal en la mitad exacta
      lin(ML + 340, y - hE / 2, ML + 420, negro, 0.5);

      // --- SECCIÓN SUPERIOR (CÓDIGO) ---
      txt("CÓDIGO", ML + 344, y - 8, { f: fontBold, s: 6.5, c: grisOsc });
      txt("STI-FOR-001", ML + 342, y - 17, { s: 7.5 });

      // --- SECCIÓN INFERIOR (VERSIÓN) ---
      // Se toma como referencia la mitad (y - hE / 2) hacia abajo
      txt("VERSIÓN", ML + 344, y - (hE / 2) - 8, { f: fontBold, s: 6.5, c: grisOsc });
      txt("1.0", ML + 355, y - (hE / 2) - 17, { s: 7.5 });
 
      // Celda STI (fondo rojo)
      rec(ML + 420, y - hE, AW - 420, hE, rojo);
      recB(ML + 420, y - hE, AW - 420, hE, negro, 0.8);
      txtC("STI", ML + 420, y - hE / 2 - 5, AW - 420, { f: fontBold, s: 14, c: blanco });
 
      y -= hE + 12;
    }
 
    // Titulo de seccion con fondo rojo
    function seccion(titulo, alto = 17) {
      checkEspacio(alto + 5);
      rec(ML, y - alto, AW, alto, rojo);
      recB(ML, y - alto, AW, alto, negro, 0.8);
      txtC(titulo, ML, y - alto + 5, AW, { f: fontBold, s: 8.5, c: blanco });
      y -= alto;
    }
 
    // Titulo de subseccion con fondo gris claro
    function subseccion(titulo, alto = 15) {
      checkEspacio(alto + 5);
      rec(ML, y - alto, AW, alto, grisClaro);
      recB(ML, y - alto, AW, alto, negro, 0.5);
      txt(titulo, ML + 4, y - alto + 4, { f: fontBold, s: 7.5 });
      y -= alto;
    }
 
    // Fila de datos con mejor espaciado (padding vertical)
    const hFila = 17; // altura de fila aumentada para mejor legibilidad
 
    function filaSimple(label, valor, anchoLabel = 110) {
      checkEspacio(hFila);
      recB(ML, y - hFila, AW, hFila, negro, 0.5);
      linV(ML + anchoLabel, y, y - hFila, negro, 0.5);
      txt(label, ML + 4, y - hFila + 5, { f: fontBold, s: 7.5 });
      txt(valor || "", ML + anchoLabel + 4, y - hFila + 5, { s: 7.5 });
      y -= hFila;
    }
 
    // ============================================================
    // INICIO DEL DOCUMENTO
    // ============================================================
    dibujarEncabezado();
 
    // ============================================================
    // INFORMACION GENERAL
    // ============================================================
    txt("INFORMACIÓN GENERAL", ML, y, { f: fontBold, s: 10, c: rojo });
    lin(ML, y - 3, MR, rojo, 1);
    y -= 16;
 
    seccion("RESPONSABLE DE LA ENTREGA");
 
    // Fila: Ubicacion | Fecha entrega
    checkEspacio(hFila);
    recB(ML, y - hFila, AW, hFila, negro, 0.5);
    linV(ML + 55, y, y - hFila, negro, 0.5);
    linV(ML + 195, y, y - hFila, negro, 0.5);
    linV(ML + 295, y, y - hFila, negro, 0.5);
    txt("Ubicación",      ML + 4,    y - hFila + 5, { f: fontBold, s: 7.5 });
    txt(datos.ciudad_entrega || "", ML + 59, y - hFila + 5, { s: 7.5 });
    txt("Fecha entrega",  ML + 199,  y - hFila + 5, { f: fontBold, s: 7.5 });
    txt(datos.fecha_entrega || "",  ML + 299, y - hFila + 5, { s: 7.5 });
    y -= hFila;
 
    filaSimple("Entregado por", datos.entregado_por, 85);
    y -= 8;
 
    seccion("INFORMACIÓN DEL USUARIO");
 
    // Fila: Usuario | Cargo
    checkEspacio(hFila);
    recB(ML, y - hFila, AW, hFila, negro, 0.5);
    linV(ML + 55, y, y - hFila, negro, 0.5);
    linV(ML + 265, y, y - hFila, negro, 0.5);
    linV(ML + 310, y, y - hFila, negro, 0.5);
    txt("Usuario",  ML + 4,   y - hFila + 5, { f: fontBold, s: 7.5 });
    txt(datos.usuario_nombre || "", ML + 59, y - hFila + 5, { s: 7.5 });
    txt("Cargo",    ML + 269, y - hFila + 5, { f: fontBold, s: 7.5 });
    txt(datos.usuario_cargo || "", ML + 314, y - hFila + 5, { s: 7.5 });
    y -= hFila;
 
    // Fila: Identificacion CC | Area
    checkEspacio(hFila);
    recB(ML, y - hFila, AW, hFila, negro, 0.5);
    linV(ML + 75, y, y - hFila, negro, 0.5);
    linV(ML + 100, y, y - hFila, negro, 0.5);
    linV(ML + 215, y, y - hFila, negro, 0.5);
    linV(ML + 250, y, y - hFila, negro, 0.5);
    txt("Identificación", ML + 4,   y - hFila + 5, { f: fontBold, s: 7.5 });
    txt("C.C.",           ML + 79,  y - hFila + 5, { s: 7.5 });
    txt(datos.usuario_cedula || "", ML + 104, y - hFila + 5, { s: 7.5 });
    txt("Área",           ML + 219, y - hFila + 5, { f: fontBold, s: 7.5 });
    txt(datos.usuario_area || "", ML + 254, y - hFila + 5, { s: 7.5 });
    y -= hFila;
 
    filaSimple("Correo corporativo", datos.usuario_correo, 115);
    y -= 10;
 
    // ============================================================
    // DESCRIPCION DEL EQUIPO
    // ============================================================
    txt("DESCRIPCIÓN DEL EQUIPO", ML, y, { f: fontBold, s: 10, c: rojo });
    lin(ML, y - 3, MR, rojo, 1);
    y -= 16;
 
    seccion("INFORMACIÓN DEL DISPOSITIVO");
 
    const sep = ML + 278;
    const filasDisp = [
      ["Tipo",          datos.tipo || "",               "Procesador",       datos.procesador || ""],
      ["Marca",         datos.marca || "",              "Memoria RAM",      datos.memoria_ram || ""],
      ["Modelo",        datos.modelo || "",             "Almacenamiento",   datos.almacenamiento || ""],
      ["Serial",        datos.serial || "",             "IMEI 1",           datos.imei_1 || ""],
      ["Hostname",      datos.hostname || "",           "IMEI 2",           datos.imei_2 || ""],
      ["S.O.",          datos.sistema_operativo || "",  "Usuario anterior", datos.usuario_anterior || ""],
      ["Versión S.O.",  datos.version_so || "",         "",                 ""],
    ];
 
    filasDisp.forEach(([l1, v1, l2, v2]) => {
      checkEspacio(hFila);
      recB(ML, y - hFila, AW, hFila, negro, 0.5);
      linV(sep, y, y - hFila, negro, 0.5);
      txt(l1, ML + 4,  y - hFila + 5, { f: fontBold, s: 7.5 });
      txt(v1, ML + 65, y - hFila + 5, { s: 7.5 });
      if (l2) {
        txt(l2, sep + 4,  y - hFila + 5, { f: fontBold, s: 7.5 });
        txt(v2, sep + 95, y - hFila + 5, { s: 7.5 });
      }
      y -= hFila;
    });
 
    y -= 8;
 
    // --- ELEMENTOS ADICIONALES ---
    seccion("INFORMACIÓN DE ELEMENTOS ADICIONALES");
 
    const colP  = [ML, ML + 125, ML + 280, ML + 400];
    const ancP  = [125, 155, 120, AW - 365];
 
    // Encabezado tabla perifericos
    rec(ML, y - hFila, AW, hFila, grisClaro);
    recB(ML, y - hFila, AW, hFila, negro, 0.5);
    ["Periféricos", "Serial", "Marca", "Modelo"].forEach((t, i) => {
      if (i > 0) linV(colP[i], y, y - hFila, negro, 0.5);
      txtC(t, colP[i], y - hFila + 5, ancP[i], { f: fontBold, s: 7.5 });
    });
    y -= hFila;
 
    const tiposFijos = ["Mouse", "Teclado", "Monitor", "Cargador", "Audífonos"];
    const perifericos = datos.perifericos || [];
    const filasPerif = [
      ...tiposFijos.map((tipo) => {
        const p = perifericos.find(p => p.tipo === tipo || p.tipo === tipo.replace("í","i"));
        return { tipo, serial: p?.serial || "N/A", marca: p?.marca || "N/A", modelo: p?.modelo || "N/A" };
      }),
      ...perifericos
        .filter(p => !tiposFijos.includes(p.tipo) && !tiposFijos.map(t=>t.replace("í","i")).includes(p.tipo))
        .map(p => ({ tipo: p.tipo, serial: p.serial||"N/A", marca: p.marca||"N/A", modelo: p.modelo||"N/A" })),
    ];
 
    filasPerif.forEach((f, idx) => {
      checkEspacio(hFila);
      if (idx % 2 === 0) rec(ML, y - hFila, AW, hFila, rgb(0.97, 0.97, 0.97));
      recB(ML, y - hFila, AW, hFila, negro, 0.5);
      colP.forEach((x, i) => { if (i > 0) linV(x, y, y - hFila, negro, 0.5); });
      txt(f.tipo,   colP[0]+4, y-hFila+5, { s: 7.5 });
      txt(f.serial, colP[1]+4, y-hFila+5, { s: 7.5 });
      txt(f.marca,  colP[2]+4, y-hFila+5, { s: 7.5 });
      txt(f.modelo, colP[3]+4, y-hFila+5, { s: 7.5 });
      y -= hFila;
    });
 
    subseccion("Software");
    filaSimple("Licencia Office",    datos.licencia_office || "",    110);
    filaSimple("Antivirus",          datos.antivirus || "",          110);
    filaSimple("Software Corporativo", datos.software_corporativo || "", 110);
    y -= 12;
 
    // ============================================================
    // CONDICIONES DE USO
    // ============================================================
    checkEspacio(60);
    txt("CONDICIONES DE USO", ML, y, { f: fontBold, s: 10, c: rojo });
    lin(ML, y - 3, MR, rojo, 1);
    y -= 16;
    txt("El empleado que recibe este equipo se compromete a:", ML, y, { s: 8, c: grisOsc });
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
      "Cualquier modificación a la configuración del equipo descrita en esta Acta, requiere la modificación o anulación del Acta y la generación de una nueva Acta de Entrega.",
    ];
 
    condiciones.forEach((c) => {
      const lineasEstimadas = Math.ceil((c.length * 5.5) / (AW - 20));
      checkEspacio(lineasEstimadas * 12 + 6);
      y = multilinea("•  " + c, ML + 6, y, AW - 16, { s: 7.5, lh: 11, c: grisOsc });
      y -= 5;
    });
 
    y -= 12;
 
    // ============================================================
    // ACEPTACION Y AUTORIZACION
    // ============================================================
    checkEspacio(100);
    txt("ACEPTACIÓN Y AUTORIZACIÓN", ML, y, { f: fontBold, s: 10, c: rojo });
    lin(ML, y - 3, MR, rojo, 1);
    y -= 16;
 
    const textoAcep = "Declaro haber recibido el equipo aquí descrito a entera satisfacción, conocer las CONDICIONES DE USO y aceptarlas; en consecuencia, me hago responsable del mismo durante el tiempo que esté a mi cargo. Si llegado el momento de la devolución, faltara alguno de sus componentes o estuviera deteriorado o dañado por causas diferentes al uso normal, expresamente autorizo a la Empresa para que descuente su valor de lo que se me adeude por concepto de salarios, prestaciones sociales, vacaciones, indemnizaciones, auxilios, bonificaciones o cualquier otro pago al que tuviera derecho. En caso de hurto calificado debo reportar ante el departamento de TI y presentar carta de lo sucedido y denuncio ante la Fiscalía.";
    y = multilinea(textoAcep, ML, y, AW, { s: 8, lh: 12, c: grisOsc });
    y -= 18;
 
    checkEspacio(80);
    txt("Firma Aceptación,", ML, y, { f: fontBold, s: 8.5 });
    y -= 40;
    lin(ML, y, ML + 200, negro, 0.8);
    y -= 13;
    txt("C.C. " + (datos.usuario_cedula || ""), ML, y, { s: 8, c: grisOsc });
    y -= 14;
    txt(datos.usuario_nombre || "", ML, y, { f: fontBold, s: 8.5 });
    y -= 22;
 
    // ============================================================
    // PIE DE PAGINA
    // ============================================================
    checkEspacio(32);
    const hPie = 30;
    const cPie = AW / 3;
 
    rec(ML, y - hPie, AW, hPie, grisClaro);
    recB(ML, y - hPie, AW, hPie, negro, 0.8);
    linV(ML + cPie,     y, y - hPie, negro, 0.5);
    linV(ML + cPie * 2, y, y - hPie, negro, 0.5);
 
    txt("Elaborado por:",  ML + 4,           y - 10, { f: fontBold, s: 7 });
    txt("Sistemas & TI",   ML + 4,           y - 20, { s: 7, c: grisOsc });
    txt("Revisado por:",   ML + cPie + 4,    y - 10, { f: fontBold, s: 7 });
    txt("Jefe de STI",     ML + cPie + 4,    y - 20, { s: 7, c: grisOsc });
    txt("Aprobado por:",   ML + cPie*2 + 4,  y - 10, { f: fontBold, s: 7 });
    txt("Jefe de STI",     ML + cPie*2 + 4,  y - 20, { s: 7, c: grisOsc });
 
    // Linea roja inferior
    rec(ML, y - hPie - 4, AW, 4, rojo);
 
    // ============================================================
    // GENERAR PDF
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