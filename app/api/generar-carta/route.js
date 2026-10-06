// API Route de Next.js que corre en el SERVIDOR
// Genera la carta de autorizacion de salida en PDF
 
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
 
export async function POST(request) {
  try {
    const datos = await request.json();
 
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
 
    // Pagina en formato carta
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
 
    const negro = rgb(0, 0, 0);
    const grisOscuro = rgb(0.2, 0.2, 0.2);
    const grisMedio = rgb(0.5, 0.5, 0.5);
    const azul = rgb(0.1, 0.3, 0.6);
 
    function texto(contenido, x, y, { fuente = fontRegular, tamanio = 9, color = negro } = {}) {
      page.drawText(String(contenido || ""), { x, y, size: tamanio, font: fuente, color });
    }
 
    function linea(x1, y1, x2, color = grisOscuro, grosor = 0.5) {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y1 }, thickness: grosor, color });
    }
 
    function fondo(x, y, ancho, alto, color) {
      page.drawRectangle({ x, y, width: ancho, height: alto, color });
    }
 
    // ============================================================
    // ENCABEZADO
    // ============================================================
    let y = height - 50;
 
    // Barra azul superior
    page.drawRectangle({ x: 40, y: y, width: width - 80, height: 5, color: azul });
    y -= 30;
 
    // Titulo
    texto("CARTA DE AUTORIZACIÓN DE ENTREGA DE EQUIPO", 40, y, { fuente: fontBold, tamanio: 14, color: azul });
    y -= 10;
    linea(40, y, width - 40, azul, 1);
    y -= 20;
 
    // Fecha y ciudad
    texto(`${datos.ciudad_entrega || ""},  ${datos.fecha_entrega || ""}`, 40, y, { tamanio: 9, color: grisOscuro });
    y -= 30;
 
    // ============================================================
    // DIRIGIDO A
    // ============================================================
    texto("Señor(a):", 40, y, { fuente: fontBold, tamanio: 10 });
    y -= 18;
    texto(datos.autorizado_por || "", 40, y, { fuente: fontBold, tamanio: 11, color: azul });
    y -= 14;
    texto("Jefe / Responsable de Autorización", 40, y, { tamanio: 9, color: grisMedio });
    y -= 30;
 
    // ============================================================
    // CUERPO DE LA CARTA
    // ============================================================
    texto("Estimado(a) señor(a),", 40, y, { tamanio: 10 });
    y -= 20;
 
    const parrafo1 = `Por medio de la presente, el Departamento de Sistemas & TI solicita su autorización para la entrega del siguiente equipo tecnológico al colaborador identificado a continuación, quien se declarará responsable del mismo durante su vinculación con la organización.`;
    // Dividimos el texto en lineas para que quepa en la pagina
    const palabras1 = parrafo1.split(" ");
    let linea1 = "";
    palabras1.forEach((palabra) => {
      if ((linea1 + palabra).length > 90) {
        texto(linea1, 40, y, { tamanio: 9.5, color: grisOscuro });
        y -= 14;
        linea1 = palabra + " ";
      } else {
        linea1 += palabra + " ";
      }
    });
    if (linea1) { texto(linea1, 40, y, { tamanio: 9.5, color: grisOscuro }); y -= 20; }
 
    y -= 10;
 
    // ============================================================
    // DATOS DEL USUARIO QUE RECIBE
    // ============================================================
    fondo(40, y - 16, width - 80, 18, azul);
    texto("DATOS DEL USUARIO QUE RECIBE EL EQUIPO", 46, y - 12, { fuente: fontBold, tamanio: 9, color: rgb(1, 1, 1) });
    y -= 35;
 
    const camposUsuario = [
      ["Nombre completo", datos.usuario_nombre],
      ["Cédula de ciudadanía", datos.usuario_cedula],
      ["Correo electrónico", datos.usuario_correo],
      ["Cargo", datos.usuario_cargo],
      ["Área / Departamento", datos.usuario_area],
    ];
 
    camposUsuario.forEach(([label, valor]) => {
      texto(label + ":", 46, y, { fuente: fontBold, tamanio: 8.5 });
      texto(valor || "-", 200, y, { tamanio: 8.5 });
      linea(40, y - 5, width - 40, rgb(0.88, 0.88, 0.88));
      y -= 18;
    });
 
    y -= 10;
 
    // ============================================================
    // DATOS DEL EQUIPO
    // ============================================================
    fondo(40, y - 16, width - 80, 18, azul);
    texto("DATOS DEL EQUIPO A ENTREGAR", 46, y - 12, { fuente: fontBold, tamanio: 9, color: rgb(1, 1, 1) });
    y -= 35;
 
    const camposEquipo = [
      ["Tipo de equipo", datos.tipo],
      ["Marca", datos.marca],
      ["Modelo", datos.modelo],
      ["Número de serie", datos.serial],
      ["Hostname asignado", datos.hostname],
    ];
 
    camposEquipo.forEach(([label, valor]) => {
      texto(label + ":", 46, y, { fuente: fontBold, tamanio: 8.5 });
      texto(valor || "-", 200, y, { tamanio: 8.5 });
      linea(40, y - 5, width - 40, rgb(0.88, 0.88, 0.88));
      y -= 18;
    });
 
    y -= 10;
 
    // ============================================================
    // DATOS DEL RESPONSABLE DE ENTREGA
    // ============================================================
    fondo(40, y - 16, width - 80, 18, azul);
    texto("DATOS DEL RESPONSABLE DE ENTREGA", 46, y - 12, { fuente: fontBold, tamanio: 9, color: rgb(1, 1, 1) });
    y -= 35;
 
    const camposEntrega = [
      ["Entregado por", datos.entregado_por],
      ["Ciudad", datos.ciudad_entrega],
      ["Fecha de entrega", datos.fecha_entrega],
    ];
 
    camposEntrega.forEach(([label, valor]) => {
      texto(label + ":", 46, y, { fuente: fontBold, tamanio: 8.5 });
      texto(valor || "-", 200, y, { tamanio: 8.5 });
      linea(40, y - 5, width - 40, rgb(0.88, 0.88, 0.88));
      y -= 18;
    });
 
    y -= 20;
 
    // ============================================================
    // PARRAFO FINAL
    // ============================================================
    const parrafo2 = `Agradecemos su pronta gestión para proceder con la entrega del equipo. Este documento queda como constancia de la solicitud de autorización formal por parte del Departamento de Sistemas & TI.`;
    const palabras2 = parrafo2.split(" ");
    let linea2 = "";
    palabras2.forEach((palabra) => {
      if ((linea2 + palabra).length > 90) {
        texto(linea2, 40, y, { tamanio: 9.5, color: grisOscuro });
        y -= 14;
        linea2 = palabra + " ";
      } else {
        linea2 += palabra + " ";
      }
    });
    if (linea2) { texto(linea2, 40, y, { tamanio: 9.5, color: grisOscuro }); y -= 14; }
 
    y -= 30;
 
    // ============================================================
    // FIRMA DEL AUTORIZANTE
    // ============================================================
    texto("Firma de autorización,", 40, y, { fuente: fontBold, tamanio: 9 });
    y -= 50;
    linea(40, y, 250, negro, 0.8);
    y -= 12;
    texto(datos.autorizado_por || "", 40, y, { fuente: fontBold, tamanio: 9 });
    y -= 14;
    texto("Responsable de Autorización", 40, y, { tamanio: 8, color: grisMedio });
 
    // ============================================================
    // PIE DE PAGINA
    // ============================================================
    linea(40, 50, width - 40, rgb(0.7, 0.7, 0.7));
    texto("Departamento de Sistemas & TI  |  Documento generado automáticamente", 40, 35, { tamanio: 7, color: grisMedio });
    texto(`Fecha de generación: ${new Date().toLocaleDateString("es-CO")}`, width - 180, 35, { tamanio: 7, color: grisMedio });
 
    // Barra azul inferior
    page.drawRectangle({ x: 40, y: 20, width: width - 80, height: 4, color: azul });
 
    // ============================================================
    // GENERAMOS Y RETORNAMOS EL PDF
    // ============================================================
    const pdfBytes = await pdfDoc.save();
 
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carta_autorizacion_${datos.usuario_nombre?.replace(/ /g, "_") || "equipo"}.pdf"`,
      },
    });
 
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}