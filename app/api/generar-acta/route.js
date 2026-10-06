// Este archivo es una API Route de Next.js que corre en el SERVIDOR
// Por eso puede usar librerias de Node.js y acceder a variables de entorno secretas
// Se accede desde el navegador haciendo fetch a /api/generar-acta
 
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
 
export async function POST(request) {
  try {
    // Recibimos los datos del formulario de salida desde el cliente
    const datos = await request.json();
 
    // Creamos un nuevo documento PDF
    const pdfDoc = await PDFDocument.create();
 
    // Incrustamos las fuentes que vamos a usar
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
 
    // Agregamos una pagina en formato carta (612 x 792 puntos)
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
 
    // Definimos colores
    const negro = rgb(0, 0, 0);
    const grisOscuro = rgb(0.2, 0.2, 0.2);
    const grisMedio = rgb(0.5, 0.5, 0.5);
    const azul = rgb(0.1, 0.3, 0.6);
    const fondoGris = rgb(0.95, 0.95, 0.95);
 
    // --- FUNCION AUXILIAR: dibuja texto en la pagina ---
    function texto(contenido, x, y, { fuente = fontRegular, tamanio = 9, color = negro } = {}) {
      page.drawText(String(contenido || ""), { x, y, size: tamanio, font: fuente, color });
    }
 
    // --- FUNCION AUXILIAR: dibuja una linea horizontal ---
    function linea(x1, y1, x2, color = grisOscuro, grosor = 0.5) {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y1 }, thickness: grosor, color });
    }
 
    // --- FUNCION AUXILIAR: dibuja un rectangulo de fondo ---
    function fondo(x, y, ancho, alto, color = fondoGris) {
      page.drawRectangle({ x, y, width: ancho, height: alto, color });
    }
 
    // --- FUNCION AUXILIAR: dibuja un rectangulo con borde ---
    function recuadro(x, y, ancho, alto) {
      page.drawRectangle({ x, y, width: ancho, height: alto, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5, color: rgb(1, 1, 1) });
    }
 
    // ============================================================
    // ENCABEZADO
    // ============================================================
    let y = height - 40;
 
    // Borde superior azul
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 4, color: azul });
    y -= 20;
 
    // Titulo principal
    texto("FORMATO DE ENTREGA DE EQUIPOS", 40, y, { fuente: fontBold, tamanio: 14, color: azul });
    texto("STI-FOR-001  v1.0", width - 160, y, { fuente: fontRegular, tamanio: 8, color: grisMedio });
    y -= 15;
    linea(40, y, width - 40, azul, 1);
    y -= 20;
 
    // ============================================================
    // SECCION: INFORMACION GENERAL - RESPONSABLE DE ENTREGA
    // ============================================================
    fondo(40, y - 16, width - 80, 18, rgb(0.1, 0.3, 0.6));
    texto("RESPONSABLE DE LA ENTREGA", 46, y - 12, { fuente: fontBold, tamanio: 9, color: rgb(1, 1, 1) });
    y -= 35;
 
    texto("Ubicación:", 46, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.ciudad_entrega || "-", 100, y, { tamanio: 8 });
    texto("Fecha entrega:", 300, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.fecha_entrega || "-", 375, y, { tamanio: 8 });
    y -= 18;
    texto("Entregado por:", 46, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.entregado_por || "-", 120, y, { tamanio: 8 });
    y -= 25;
 
    // ============================================================
    // SECCION: INFORMACION DEL USUARIO
    // ============================================================
    fondo(40, y - 16, width - 80, 18, rgb(0.1, 0.3, 0.6));
    texto("INFORMACIÓN DEL USUARIO", 46, y - 12, { fuente: fontBold, tamanio: 9, color: rgb(1, 1, 1) });
    y -= 35;
 
    texto("Usuario:", 46, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.usuario_nombre || "-", 90, y, { tamanio: 8 });
    texto("Cargo:", 300, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.usuario_cargo || "-", 330, y, { tamanio: 8 });
    y -= 18;
    texto("Identificación:", 46, y, { fuente: fontBold, tamanio: 8 });
    texto("C.C.", 115, y, { tamanio: 8 });
    texto(datos.usuario_cedula || "-", 135, y, { tamanio: 8 });
    texto("Área:", 300, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.usuario_area || "-", 325, y, { tamanio: 8 });
    y -= 18;
    texto("Correo corporativo:", 46, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.usuario_correo || "-", 135, y, { tamanio: 8 });
    y -= 25;
 
    // ============================================================
    // SECCION: DESCRIPCION DEL EQUIPO
    // ============================================================
    texto("DESCRIPCIÓN DEL EQUIPO", 40, y, { fuente: fontBold, tamanio: 11, color: azul });
    y -= 8;
    linea(40, y, width - 40, azul, 0.8);
    y -= 20;
 
    fondo(40, y - 16, width - 80, 18, rgb(0.1, 0.3, 0.6));
    texto("INFORMACIÓN DEL DISPOSITIVO", 46, y - 12, { fuente: fontBold, tamanio: 9, color: rgb(1, 1, 1) });
    y -= 35;
 
    // Columna izquierda y derecha de datos del equipo
    const col1x = 46;
    const col1v = 110;
    const col2x = 310;
    const col2v = 390;
 
    const camposEquipo = [
      ["Tipo", datos.tipo, "Procesador", datos.procesador],
      ["Marca", datos.marca, "Memoria RAM", datos.memoria_ram],
      ["Modelo", datos.modelo, "Almacenamiento", datos.almacenamiento],
      ["Serial", datos.serial, "IMEI 1", datos.imei_1],
      ["Hostname", datos.hostname, "IMEI 2", datos.imei_2],
      ["S.O.", datos.sistema_operativo, "Usuario anterior", datos.usuario_anterior],
      ["Versión S.O.", datos.version_so, "", ""],
    ];
 
    camposEquipo.forEach(([l1, v1, l2, v2]) => {
      texto(l1 + ":", col1x, y, { fuente: fontBold, tamanio: 8 });
      texto(v1 || "-", col1v, y, { tamanio: 8 });
      if (l2) {
        texto(l2 + ":", col2x, y, { fuente: fontBold, tamanio: 8 });
        texto(v2 || "-", col2v, y, { tamanio: 8 });
      }
      linea(40, y - 5, width - 40, rgb(0.85, 0.85, 0.85));
      y -= 16;
    });
 
    y -= 10;
 
    // ============================================================
    // SECCION: ELEMENTOS ADICIONALES
    // ============================================================
    fondo(40, y - 16, width - 80, 18, rgb(0.1, 0.3, 0.6));
    texto("INFORMACIÓN DE ELEMENTOS ADICIONALES", 46, y - 12, { fuente: fontBold, tamanio: 9, color: rgb(1, 1, 1) });
    y -= 30;
 
    // Encabezado de tabla de perifericos
    fondo(40, y - 14, width - 80, 16, rgb(0.85, 0.85, 0.85));
    texto("Periférico", 46, y - 10, { fuente: fontBold, tamanio: 8 });
    texto("Serial", 200, y - 10, { fuente: fontBold, tamanio: 8 });
    texto("Marca", 320, y - 10, { fuente: fontBold, tamanio: 8 });
    texto("Modelo", 430, y - 10, { fuente: fontBold, tamanio: 8 });
    y -= 28;
 
    // Filas de perifericos
    const perifericos = datos.perifericos || [];
    const tiposBase = ["Mouse", "Teclado", "Monitor", "Cargador", "Audífonos"];
 
    // Mostramos primero los tipos base y luego los adicionales
    const filas = [
      ...tiposBase.map((tipo) => {
        const p = perifericos.find((p) => p.tipo === tipo);
        return { tipo, serial: p?.serial || "", marca: p?.marca || "", modelo: p?.modelo || "" };
      }),
      ...perifericos.filter((p) => !tiposBase.includes(p.tipo)).map((p) => ({
        tipo: p.tipo, serial: p.serial || "", marca: p.marca || "", modelo: p.modelo || ""
      })),
    ];
 
    filas.forEach((fila, i) => {
      if (i % 2 === 0) fondo(40, y - 12, width - 80, 16, rgb(0.97, 0.97, 0.97));
      texto(fila.tipo, 46, y - 8, { tamanio: 8 });
      texto(fila.serial, 200, y - 8, { tamanio: 8 });
      texto(fila.marca, 320, y - 8, { tamanio: 8 });
      texto(fila.modelo, 430, y - 8, { tamanio: 8 });
      linea(40, y - 14, width - 40, rgb(0.88, 0.88, 0.88));
      y -= 16;
    });
 
    y -= 10;
 
    // Software
    fondo(40, y - 14, width - 80, 16, rgb(0.85, 0.85, 0.85));
    texto("Software", 46, y - 10, { fuente: fontBold, tamanio: 8 });
    y -= 28;
 
    texto("Licencia Office:", 46, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.licencia_office || "-", 130, y, { tamanio: 8 });
    y -= 16;
    texto("Antivirus:", 46, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.antivirus || "-", 100, y, { tamanio: 8 });
    y -= 16;
    texto("Software Corporativo:", 46, y, { fuente: fontBold, tamanio: 8 });
    texto(datos.software_corporativo || "-", 160, y, { tamanio: 8 });
    y -= 25;
 
    // ============================================================
    // CONDICIONES DE USO
    // ============================================================
    texto("CONDICIONES DE USO", 40, y, { fuente: fontBold, tamanio: 10, color: azul });
    y -= 8;
    linea(40, y, width - 40, azul, 0.8);
    y -= 14;
 
    const condiciones = [
      "No retirar o adicionar periféricos o dispositivos internos o externos; no desarmar o destapar el equipo.",
      "No instalar software diferente al autorizado, el departamento de STI es el único autorizado en proporcionar el software y su respectiva licencia.",
      "Informar al jefe inmediato en caso de pérdida o robo, en tal caso el empleado asume el 100% del valor del deducible del seguro.",
      "Informar de manera oportuna al jefe inmediato y al departamento de STI sobre los daños presentados al equipo.",
      "No utilizar el equipo para realizar trabajos ajenos a TRIENERGY o almacenar información no relacionada con los asuntos de esta.",
      "Devolver el equipo al departamento de STI por motivo de cambio de equipo o retiro de la Empresa, en las mismas condiciones especificadas en esta Acta.",
    ];
 
    condiciones.forEach((c) => {
      texto("•  " + c, 46, y, { tamanio: 7, color: grisOscuro });
      y -= 13;
    });
 
    y -= 10;
 
    // ============================================================
    // ACEPTACION Y FIRMA
    // ============================================================
    texto("ACEPTACIÓN Y AUTORIZACIÓN", 40, y, { fuente: fontBold, tamanio: 10, color: azul });
    y -= 8;
    linea(40, y, width - 40, azul, 0.8);
    y -= 14;
 
    const textoAceptacion = "Declaro haber recibido el equipo aquí descrito a entera satisfacción, conocer las CONDICIONES DE USO y aceptarlas; en consecuencia, me hago responsable del mismo durante el tiempo que esté a mi cargo.";
    texto(textoAceptacion, 46, y, { tamanio: 7.5, color: grisOscuro });
    y -= 30;
 
    // Linea de firma
    texto("Firma Aceptación,", 46, y, { fuente: fontBold, tamanio: 8 });
    y -= 35;
    linea(46, y, 250, negro, 0.8);
    y -= 12;
    texto("C.C. " + (datos.usuario_cedula || ""), 46, y, { tamanio: 8 });
    texto(datos.usuario_nombre || "", 46, y - 12, { fuente: fontBold, tamanio: 8 });
 
    // ============================================================
    // PIE DE PAGINA
    // ============================================================
    const yPie = 35;
    linea(40, yPie + 15, width - 40, rgb(0.7, 0.7, 0.7));
    texto("Elaborado por: Sistemas & TI", 46, yPie, { tamanio: 7, color: grisMedio });
    texto("Revisado por: Jefe de Sistemas & TI", 220, yPie, { tamanio: 7, color: grisMedio });
    texto("Aprobado por: Jefe de Sistemas & TI", 400, yPie, { tamanio: 7, color: grisMedio });
 
    // ============================================================
    // GENERAMOS Y RETORNAMOS EL PDF
    // ============================================================
    const pdfBytes = await pdfDoc.save();
 
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="acta_entrega_${datos.usuario_nombre?.replace(/ /g, "_") || "equipo"}.pdf"`,
      },
    });
 
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}