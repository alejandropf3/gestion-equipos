// API Route de Next.js que corre en el SERVIDOR
// Genera el acta de entrega de equipos replicando la estructura del documento STI-FOR-001
 
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
 
export async function POST(request) {
  try {
    const datos = await request.json();
 
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
 
    // Pagina en formato carta (612 x 792 puntos)
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
 
    // Colores
    const negro = rgb(0, 0, 0);
    const blanco = rgb(1, 1, 1);
    const grisClaro = rgb(0.9, 0.9, 0.9);
    const grisMedio = rgb(0.7, 0.7, 0.7);
    const azulOscuro = rgb(0.07, 0.18, 0.38);
 
    // --- FUNCIONES AUXILIARES ---
 
    // Dibuja texto en la pagina
    function txt(contenido, x, y, { fuente = fontRegular, tam = 8, color = negro } = {}) {
      const valor = contenido === null || contenido === undefined || contenido === "" ? "" : String(contenido);
      page.drawText(valor, { x, y, size: tam, font: fuente, color });
    }
 
    // Dibuja un rectangulo relleno
    function rect(x, y, w, h, color) {
      page.drawRectangle({ x, y, width: w, height: h, color });
    }
 
    // Dibuja un rectangulo con borde
    function rectBorde(x, y, w, h, colorBorde = negro, grosor = 0.5, colorRelleno = null) {
      if (colorRelleno) {
        page.drawRectangle({ x, y, width: w, height: h, color: colorRelleno });
      }
      page.drawRectangle({ x, y, width: w, height: h, borderColor: colorBorde, borderWidth: grosor, color: colorRelleno || rgb(1,1,1,0) });
    }
 
    // Dibuja una linea horizontal
    function linea(x1, y, x2, color = negro, grosor = 0.5) {
      page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: grosor, color });
    }
 
    // Dibuja una linea vertical
    function lineaV(x, y1, y2, color = negro, grosor = 0.5) {
      page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: grosor, color });
    }
 
    // Dibuja texto centrado dentro de un ancho dado
    function txtCentrado(contenido, x, y, ancho, { fuente = fontRegular, tam = 8, color = negro } = {}) {
      const valor = String(contenido || "");
      const anchoTexto = fuente.widthOfTextAtSize(valor, tam);
      const xCentrado = x + (ancho - anchoTexto) / 2;
      page.drawText(valor, { x: xCentrado, y, size: tam, font: fuente, color });
    }
 
    // Dibuja texto que puede ocupar multiples lineas
    function txtMultilinea(contenido, x, y, anchoMax, { fuente = fontRegular, tam = 7.5, color = negro, lineHeight = 11 } = {}) {
      const palabras = String(contenido || "").split(" ");
      let lineaActual = "";
      let yActual = y;
 
      palabras.forEach((palabra) => {
        const prueba = lineaActual + (lineaActual ? " " : "") + palabra;
        if (fuente.widthOfTextAtSize(prueba, tam) > anchoMax && lineaActual) {
          page.drawText(lineaActual, { x, y: yActual, size: tam, font: fuente, color });
          yActual -= lineHeight;
          lineaActual = palabra;
        } else {
          lineaActual = prueba;
        }
      });
      if (lineaActual) {
        page.drawText(lineaActual, { x, y: yActual, size: tam, font: fuente, color });
        yActual -= lineHeight;
      }
      return yActual; // Retorna la y final para saber donde continuar
    }
 
    // ============================================================
    // ENCABEZADO - Replica la tabla de encabezado del documento
    // ============================================================
    const margenIzq = 35;
    const margenDer = 577;
    const anchoTotal = margenDer - margenIzq;
    let y = height - 35;
 
    // Fila 1 del encabezado: Logo | Titulo | Codigo | Version | STI
    const hEncabezado = 20;
    rectBorde(margenIzq, y - hEncabezado, 60, hEncabezado, negro, 0.8); // Celda logo
    txt("LOGO", margenIzq + 20, y - 13, { fuente: fontBold, tam: 7 });
 
    rectBorde(margenIzq + 60, y - hEncabezado, 260, hEncabezado, negro, 0.8, grisClaro);
    txtCentrado("FORMATO DE ENTREGA DE EQUIPOS", margenIzq + 60, y - 13, 260, { fuente: fontBold, tam: 9 });
 
    rectBorde(margenIzq + 320, y - hEncabezado, 80, hEncabezado, negro, 0.8);
    txt("CÓDIGO", margenIzq + 325, y - 8, { fuente: fontBold, tam: 6.5 });
    txt("STI-FOR-001", margenIzq + 323, y - 16, { tam: 7 });
 
    rectBorde(margenIzq + 400, y - hEncabezado, 60, hEncabezado, negro, 0.8);
    txt("VERSIÓN", margenIzq + 405, y - 8, { fuente: fontBold, tam: 6.5 });
    txt("1.0", margenIzq + 418, y - 16, { tam: 7 });
 
    rectBorde(margenIzq + 460, y - hEncabezado, anchoTotal - 460, hEncabezado, negro, 0.8, grisClaro);
    txtCentrado("STI", margenIzq + 460, y - 13, anchoTotal - 460, { fuente: fontBold, tam: 10 });
 
    y -= hEncabezado + 10;
 
    // ============================================================
    // SECCION: INFORMACION GENERAL
    // ============================================================
    txt("INFORMACIÓN GENERAL", margenIzq, y, { fuente: fontBold, tam: 9 });
    y -= 14;
 
    // --- Tabla RESPONSABLE DE LA ENTREGA ---
    const hFila = 16;
 
    // Encabezado de la tabla
    rect(margenIzq, y - hFila, anchoTotal, hFila, azulOscuro);
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.8);
    txtCentrado("RESPONSABLE DE LA ENTREGA", margenIzq, y - 11, anchoTotal, { fuente: fontBold, tam: 8, color: blanco });
    y -= hFila;
 
    // Fila: Ubicacion | valor | Fecha entrega | valor
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    lineaV(margenIzq + 60, y, y - hFila, negro, 0.5);
    lineaV(margenIzq + 200, y, y - hFila, negro, 0.5);
    lineaV(margenIzq + 290, y, y - hFila, negro, 0.5);
    txt("Ubicación", margenIzq + 3, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.ciudad_entrega || "", margenIzq + 63, y - 11, { tam: 7.5 });
    txt("Fecha entrega", margenIzq + 203, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.fecha_entrega || "", margenIzq + 293, y - 11, { tam: 7.5 });
    y -= hFila;
 
    // Fila: Entregado por | valor
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    lineaV(margenIzq + 80, y, y - hFila, negro, 0.5);
    txt("Entregado por", margenIzq + 3, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.entregado_por || "", margenIzq + 83, y - 11, { tam: 7.5 });
    y -= hFila + 8;
 
    // --- Tabla INFORMACION DEL USUARIO ---
    rect(margenIzq, y - hFila, anchoTotal, hFila, azulOscuro);
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.8);
    txtCentrado("INFORMACIÓN DEL USUARIO", margenIzq, y - 11, anchoTotal, { fuente: fontBold, tam: 8, color: blanco });
    y -= hFila;
 
    // Fila: Usuario | valor | Cargo | valor
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    lineaV(margenIzq + 50, y, y - hFila, negro, 0.5);
    lineaV(margenIzq + 260, y, y - hFila, negro, 0.5);
    lineaV(margenIzq + 300, y, y - hFila, negro, 0.5);
    txt("Usuario", margenIzq + 3, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.usuario_nombre || "", margenIzq + 53, y - 11, { tam: 7.5 });
    txt("Cargo", margenIzq + 263, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.usuario_cargo || "", margenIzq + 303, y - 11, { tam: 7.5 });
    y -= hFila;
 
    // Fila: Identificacion | CC | valor | Area | valor
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    lineaV(margenIzq + 70, y, y - hFila, negro, 0.5);
    lineaV(margenIzq + 95, y, y - hFila, negro, 0.5);
    lineaV(margenIzq + 200, y, y - hFila, negro, 0.5);
    lineaV(margenIzq + 240, y, y - hFila, negro, 0.5);
    txt("Identificación", margenIzq + 3, y - 11, { fuente: fontBold, tam: 7.5 });
    txt("C.C.", margenIzq + 73, y - 11, { tam: 7.5 });
    txt(datos.usuario_cedula || "", margenIzq + 98, y - 11, { tam: 7.5 });
    txt("Área", margenIzq + 203, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.usuario_area || "", margenIzq + 243, y - 11, { tam: 7.5 });
    y -= hFila;
 
    // Fila: Correo corporativo | valor
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    lineaV(margenIzq + 105, y, y - hFila, negro, 0.5);
    txt("Correo corporativo", margenIzq + 3, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.usuario_correo || "", margenIzq + 108, y - 11, { tam: 7.5 });
    y -= hFila + 8;
 
    // ============================================================
    // SECCION: DESCRIPCION DEL EQUIPO
    // ============================================================
    txt("DESCRIPCIÓN DEL EQUIPO", margenIzq, y, { fuente: fontBold, tam: 9 });
    y -= 14;
 
    // --- Tabla INFORMACION DEL DISPOSITIVO ---
    rect(margenIzq, y - hFila, anchoTotal, hFila, azulOscuro);
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.8);
    txtCentrado("INFORMACIÓN DEL DISPOSITIVO", margenIzq, y - 11, anchoTotal, { fuente: fontBold, tam: 8, color: blanco });
    y -= hFila;
 
    // Dos columnas de datos del dispositivo
    const col1Label = margenIzq + 3;
    const col1Value = margenIzq + 60;
    const col2Label = margenIzq + 275;
    const col2Value = margenIzq + 360;
    const separadorMedio = margenIzq + 270;
 
    const filasDispositivo = [
      ["Tipo", datos.tipo || "", "Procesador", datos.procesador || ""],
      ["Marca", datos.marca || "", "Memoria RAM", datos.memoria_ram || ""],
      ["Modelo", datos.modelo || "", "Almacenamiento", datos.almacenamiento || ""],
      ["Serial", datos.serial || "", "IMEI 1", datos.imei_1 || ""],
      ["Hostname", datos.hostname || "", "IMEI 2", datos.imei_2 || ""],
      ["S.O.", datos.sistema_operativo || "", "Usuario anterior:", datos.usuario_anterior || ""],
      ["Versión S.O.", datos.version_so || "", "", ""],
    ];
 
    filasDispositivo.forEach(([l1, v1, l2, v2]) => {
      rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
      lineaV(separadorMedio, y, y - hFila, negro, 0.5);
      txt(l1, col1Label, y - 11, { fuente: fontBold, tam: 7.5 });
      txt(v1, col1Value, y - 11, { tam: 7.5 });
      if (l2) {
        txt(l2, col2Label, y - 11, { fuente: fontBold, tam: 7.5 });
        txt(v2, col2Value, y - 11, { tam: 7.5 });
      }
      y -= hFila;
    });
 
    y -= 8;
 
    // --- Tabla ELEMENTOS ADICIONALES ---
    rect(margenIzq, y - hFila, anchoTotal, hFila, azulOscuro);
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.8);
    txtCentrado("INFORMACIÓN DE ELEMENTOS ADICIONALES", margenIzq, y - 11, anchoTotal, { fuente: fontBold, tam: 8, color: blanco });
    y -= hFila;
 
    // Encabezado de columnas de perifericos
    const colPer = [margenIzq, margenIzq + 120, margenIzq + 270, margenIzq + 390];
    const anchosCols = [120, 150, 120, anchoTotal - 390];
 
    rect(margenIzq, y - hFila, anchoTotal, hFila, grisClaro);
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    ["Periféricos", "Serial", "Marca", "Modelo"].forEach((titulo, i) => {
      if (i > 0) lineaV(colPer[i], y, y - hFila, negro, 0.5);
      txtCentrado(titulo, colPer[i], y - 11, anchosCols[i], { fuente: fontBold, tam: 7.5 });
    });
    y -= hFila;
 
    // Filas de perifericos
    // Primero los tipos fijos, luego los adicionales
    const tiposFijos = ["Mouse", "Teclado", "Monitor", "Cargador", "Audífonos"];
    const perifericos = datos.perifericos || [];
 
    const filasPerif = [
      ...tiposFijos.map((tipo) => {
        const p = perifericos.find((p) => p.tipo === tipo || p.tipo === tipo.replace("í", "i"));
        return { tipo, serial: p?.serial || "N/A", marca: p?.marca || "N/A", modelo: p?.modelo || "N/A" };
      }),
      ...perifericos
        .filter((p) => !tiposFijos.includes(p.tipo) && !tiposFijos.map(t => t.replace("í","i")).includes(p.tipo))
        .map((p) => ({ tipo: p.tipo, serial: p.serial || "N/A", marca: p.marca || "N/A", modelo: p.modelo || "N/A" })),
    ];
 
    filasPerif.forEach((fila) => {
      rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
      colPer.forEach((x, i) => { if (i > 0) lineaV(x, y, y - hFila, negro, 0.5); });
      txt(fila.tipo, colPer[0] + 3, y - 11, { tam: 7.5 });
      txt(fila.serial, colPer[1] + 3, y - 11, { tam: 7.5 });
      txt(fila.marca, colPer[2] + 3, y - 11, { tam: 7.5 });
      txt(fila.modelo, colPer[3] + 3, y - 11, { tam: 7.5 });
      y -= hFila;
    });
 
    // Fila de Software
    rect(margenIzq, y - hFila, anchoTotal, hFila, grisClaro);
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    txt("Software", margenIzq + 3, y - 11, { fuente: fontBold, tam: 7.5 });
    y -= hFila;
 
    // Licencia Office
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    lineaV(margenIzq + 120, y, y - hFila, negro, 0.5);
    txt("Licencia Office", margenIzq + 3, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.licencia_office || "", margenIzq + 123, y - 11, { tam: 7.5 });
    y -= hFila;
 
    // Antivirus
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    lineaV(margenIzq + 120, y, y - hFila, negro, 0.5);
    txt("Antivirus", margenIzq + 3, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.antivirus || "", margenIzq + 123, y - 11, { tam: 7.5 });
    y -= hFila;
 
    // Software Corporativo
    rectBorde(margenIzq, y - hFila, anchoTotal, hFila, negro, 0.5);
    lineaV(margenIzq + 120, y, y - hFila, negro, 0.5);
    txt("Software Corporativo", margenIzq + 3, y - 11, { fuente: fontBold, tam: 7.5 });
    txt(datos.software_corporativo || "", margenIzq + 123, y - 11, { tam: 7.5 });
    y -= hFila + 8;
 
    // ============================================================
    // CONDICIONES DE USO
    // ============================================================
    txt("CONDICIONES DE USO", margenIzq, y, { fuente: fontBold, tam: 9 });
    y -= 12;
    txt("El empleado que recibe este equipo se compromete a:", margenIzq, y, { tam: 7.5 });
    y -= 12;
 
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
      y = txtMultilinea("• " + c, margenIzq + 5, y, anchoTotal - 10, { tam: 7, lineHeight: 10 });
      y -= 2;
    });
 
    y -= 8;
 
    // ============================================================
    // ACEPTACION Y AUTORIZACION
    // ============================================================
    txt("ACEPTACIÓN Y AUTORIZACIÓN", margenIzq, y, { fuente: fontBold, tam: 9 });
    y -= 12;
 
    const textoAceptacion = "Declaro haber recibido el equipo aquí descrito a entera satisfacción, conocer las CONDICIONES DE USO y aceptarlas; en consecuencia, me hago responsable del mismo durante el tiempo que esté a mi cargo. Si llegado el momento de la devolución, faltara alguno de sus componentes o estuviera deteriorado o dañado por causas diferentes al uso normal, expresamente autorizo a la Empresa para que descuente su valor de lo que se me adeude por concepto de salarios, prestaciones sociales, vacaciones, indemnizaciones, auxilios, bonificaciones o cualquier otro pago al que tuviera derecho. En caso de hurto calificado debo reportar ante el departamento de TI y presentar carta de lo sucedido y denuncio ante la Fiscalía.";
    y = txtMultilinea(textoAceptacion, margenIzq, y, anchoTotal, { tam: 7.5, lineHeight: 11 });
    y -= 12;
 
    txt("Firma Aceptación,", margenIzq, y, { fuente: fontBold, tam: 8 });
    y -= 30;
    linea(margenIzq, y, margenIzq + 200, negro, 0.8);
    y -= 12;
    txt("C.C. " + (datos.usuario_cedula || ""), margenIzq, y, { tam: 8 });
    y -= 12;
    txt(datos.usuario_nombre || "", margenIzq, y, { fuente: fontBold, tam: 8 });
    y -= 20;
 
    // ============================================================
    // PIE DE PAGINA - Tabla de elaborado/revisado/aprobado
    // ============================================================
    const hPie = 28;
    const anchoCeldaPie = anchoTotal / 3;
 
    // Fila 1: Labels
    rect(margenIzq, y - hPie, anchoTotal, hPie, grisClaro);
    rectBorde(margenIzq, y - hPie, anchoTotal, hPie, negro, 0.8);
    lineaV(margenIzq + anchoCeldaPie, y, y - hPie, negro, 0.5);
    lineaV(margenIzq + anchoCeldaPie * 2, y, y - hPie, negro, 0.5);
 
    txt("Elaborado por: ", margenIzq + 5, y - 10, { tam: 7 });
    txt("Sistemas & TI", margenIzq + 5, y - 10, { tam: 7 }); // Se sobreescribe abajo
    txtMultilinea("Elaborado por: Sistemas & TI", margenIzq + 5, y - 9, anchoCeldaPie - 10, { fuente: fontBold, tam: 7, lineHeight: 9 });
    txt("Fecha: 20/10/2025", margenIzq + 5, y - 22, { tam: 6.5 });
 
    txtMultilinea("Revisado por: Jefe de Sistemas & TI", margenIzq + anchoCeldaPie + 5, y - 9, anchoCeldaPie - 10, { fuente: fontBold, tam: 7, lineHeight: 9 });
    txt("Fecha de revisión: 20/10/2025", margenIzq + anchoCeldaPie + 5, y - 22, { tam: 6.5 });
 
    txtMultilinea("Aprobado por: Jefe de Sistemas & TI", margenIzq + anchoCeldaPie * 2 + 5, y - 9, anchoCeldaPie - 10, { fuente: fontBold, tam: 7, lineHeight: 9 });
    txt("Fecha de aprobación: 20/10/2025", margenIzq + anchoCeldaPie * 2 + 5, y - 22, { tam: 6.5 });
 
    // ============================================================
    // GENERAMOS Y RETORNAMOS EL PDF
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