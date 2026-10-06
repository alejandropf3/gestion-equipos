"use client"; // Este componente corre en el navegador
 
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
 
const TIPOS_PERIFERICO = ["Mouse", "Teclado", "Monitor", "Cargador", "Audifonos", "Docking Station", "Otro"];
 
export default function SalidaEquipo({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise);
  const { id } = params;
 
  // --- ESTADOS ---
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [pasoActual, setPasoActual] = useState(""); // Mensaje del paso actual al guardar
  const [error, setError] = useState("");
 
  const [perifericosEquipo, setPerifericosEquipo] = useState([]);
  const [perifericosDisponibles, setPerifericosDisponibles] = useState([]);
  const [busquedaPeriferico, setBusquedaPeriferico] = useState("");
  const [mostrarModalVincular, setMostrarModalVincular] = useState(false);
  const [perifericosSeleccionados, setPerifericosSeleccionados] = useState([]);
  const [perifericosNuevos, setPerifericosNuevos] = useState([]);
 
  const [salida, setSalida] = useState({
    usuario_nombre: "",
    usuario_correo: "",
    usuario_cedula: "",
    usuario_cargo: "",
    usuario_area: "",
    entregado_por: "",
    ciudad_entrega: "",
    fecha_entrega: new Date().toISOString().split("T")[0],
    autorizado_por: "",
    nuevo_hostname: "",
    observaciones: "",
  });
 
  // --- CARGA INICIAL ---
  useEffect(() => {
    async function cargarDatos() {
      const { data: equipoData } = await supabase
        .from("equipos")
        .select("*")
        .eq("id", id)
        .single();
 
      const { data: perifericosData } = await supabase
        .from("perifericos")
        .select("*")
        .eq("equipo_id", id);
 
      const { data: disponiblesData } = await supabase
        .from("perifericos")
        .select("*")
        .is("equipo_id", null);
 
      setEquipo(equipoData);
      setPerifericosEquipo(perifericosData || []);
      setPerifericosDisponibles(disponiblesData || []);
 
      if (equipoData?.hostname_actual) {
        setSalida((prev) => ({ ...prev, nuevo_hostname: equipoData.hostname_actual }));
      }
 
      if (equipoData?.estado !== "En reserva") {
        setError(`Este equipo esta en estado "${equipoData?.estado}" y no puede registrar una salida.`);
      }
 
      setLoading(false);
    }
    cargarDatos();
  }, [id]);
 
  // --- ACTUALIZAR CAMPOS ---
  function actualizarCampo(e) {
    const { name, value } = e.target;
    setSalida((prev) => ({ ...prev, [name]: value }));
  }
 
  // --- SELECCIONAR PERIFERICO EXISTENTE ---
  function seleccionarPeriferico(periferico) {
    if (perifericosSeleccionados.find((p) => p.id === periferico.id)) return;
    setPerifericosSeleccionados((prev) => [...prev, periferico]);
    setMostrarModalVincular(false);
    setBusquedaPeriferico("");
  }
 
  function quitarSeleccionado(perifericoId) {
    setPerifericosSeleccionados((prev) => prev.filter((p) => p.id !== perifericoId));
  }
 
  // --- PERIFERICOS NUEVOS ---
  function agregarNuevoPeriferico() {
    setPerifericosNuevos((prev) => [...prev, { tipo: "Mouse", marca: "", modelo: "", serial: "" }]);
  }
 
  function actualizarNuevoPeriferico(index, campo, valor) {
    setPerifericosNuevos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [campo]: valor } : p))
    );
  }
 
  function eliminarNuevoPeriferico(index) {
    setPerifericosNuevos((prev) => prev.filter((_, i) => i !== index));
  }
 
  // --- FUNCION: GENERAR PDF Y SUBIRLO A SUPABASE STORAGE ---
  // Llama a la API route, recibe el PDF y lo sube a Supabase Storage
  // Retorna la URL publica del archivo subido
  async function generarYSubirPDF(endpoint, datos, nombreArchivo) {
    try {
      // 1. Llamamos a la API route que genera el PDF
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
 
      if (!response.ok) throw new Error("Error al generar el PDF");
 
      // 2. Convertimos la respuesta a un blob (archivo binario)
      const blob = await response.blob();
 
      // 3. Subimos el blob a Supabase Storage en el bucket "documentos"
      const { data: archivoSubido, error: errorSubida } = await supabase.storage
        .from("documentos")
        .upload(nombreArchivo, blob, {
          contentType: "application/pdf",
          upsert: true, // Si ya existe, lo sobreescribe
        });
 
      if (errorSubida) throw new Error("Error al subir el PDF: " + errorSubida.message);
 
      // 4. Obtenemos la URL publica del archivo subido
      const { data: urlData } = supabase.storage
        .from("documentos")
        .getPublicUrl(nombreArchivo);
 
      return urlData.publicUrl;
    } catch (err) {
      console.error("Error en generarYSubirPDF:", err);
      return null; // Si falla, retornamos null para no bloquear el guardado
    }
  }
 
  // --- GUARDAR SALIDA ---
  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
 
    if (!equipo) {
      setError("No se pudo cargar el equipo.");
      setGuardando(false);
      return;
    }
 
    if (equipo.estado !== "En reserva") {
      setError(`Este equipo esta en estado "${equipo.estado}" y no puede registrar una salida.`);
      setGuardando(false);
      return;
    }
 
    if (
      !salida.usuario_nombre || !salida.usuario_cedula || !salida.usuario_correo ||
      !salida.usuario_cargo || !salida.usuario_area || !salida.entregado_por || !salida.autorizado_por
    ) {
      setError("Por favor completa todos los campos obligatorios.");
      setGuardando(false);
      return;
    }
 
    // Armamos la lista completa de perifericos para los documentos
    const todosLosPerifericos = [
      ...perifericosEquipo,
      ...perifericosSeleccionados,
      ...perifericosNuevos.filter((p) => p.marca),
    ];
 
    // Datos que se pasan a las APIs de generacion de PDF
    const datosPDF = {
      // Datos del equipo
      tipo: equipo.tipo,
      marca: equipo.marca,
      modelo: equipo.modelo,
      serial: equipo.serial,
      hostname: salida.nuevo_hostname || equipo.hostname_actual,
      procesador: equipo.procesador,
      memoria_ram: equipo.memoria_ram,
      almacenamiento: equipo.almacenamiento,
      sistema_operativo: equipo.sistema_operativo,
      version_so: equipo.version_so,
      imei_1: equipo.imei_1,
      imei_2: equipo.imei_2,
      licencia_office: equipo.licencia_office,
      antivirus: equipo.antivirus,
      usuario_anterior: equipo.usuario_actual,
 
      // Datos del nuevo usuario
      usuario_nombre: salida.usuario_nombre,
      usuario_correo: salida.usuario_correo,
      usuario_cedula: salida.usuario_cedula,
      usuario_cargo: salida.usuario_cargo,
      usuario_area: salida.usuario_area,
 
      // Datos de la entrega
      entregado_por: salida.entregado_por,
      ciudad_entrega: salida.ciudad_entrega,
      fecha_entrega: salida.fecha_entrega,
      autorizado_por: salida.autorizado_por,
 
      // Perifericos
      perifericos: todosLosPerifericos,
    };
 
    // Nombre unico para cada archivo usando la fecha y el serial del equipo
    const timestamp = Date.now();
    const nombreBase = `${equipo.serial}_${timestamp}`;
 
    // PASO 1: Generamos el acta de entrega
    setPasoActual("Generando acta de entrega...");
    const urlActa = await generarYSubirPDF(
      "/api/generar-acta",
      datosPDF,
      `actas/${nombreBase}_acta.pdf`
    );
 
    // PASO 2: Generamos la carta de autorizacion
    setPasoActual("Generando carta de autorizacion...");
    const urlCarta = await generarYSubirPDF(
      "/api/generar-carta",
      datosPDF,
      `cartas/${nombreBase}_carta.pdf`
    );
 
    // PASO 3: Guardamos el registro de salida con las URLs de los documentos
    setPasoActual("Guardando registro de salida...");
    const { data: salidaGuardada, error: errorSalida } = await supabase
      .from("registros_salida")
      .insert([{
        equipo_id: id,
        hostname: equipo.hostname_actual,
        nuevo_hostname: salida.nuevo_hostname || equipo.hostname_actual,
        usuario_nombre: salida.usuario_nombre,
        usuario_correo: salida.usuario_correo,
        usuario_cedula: salida.usuario_cedula,
        usuario_cargo: salida.usuario_cargo,
        usuario_area: salida.usuario_area,
        entregado_por: salida.entregado_por,
        ciudad_entrega: salida.ciudad_entrega,
        fecha_entrega: salida.fecha_entrega,
        autorizado_por: salida.autorizado_por,
        observaciones: salida.observaciones,
        // Guardamos las URLs de los documentos generados
        url_acta_entrega: urlActa,
        url_carta_autorizacion: urlCarta,
      }])
      .select()
      .single();
 
    if (errorSalida) {
      setError("Error al registrar la salida: " + errorSalida.message);
      setGuardando(false);
      setPasoActual("");
      return;
    }
 
    // PASO 4: Actualizamos el equipo
    setPasoActual("Actualizando equipo...");
    await supabase
      .from("equipos")
      .update({
        estado: "Entregado",
        usuario_actual: salida.usuario_nombre,
        propietario_nombre: salida.usuario_nombre,
        propietario_cedula: salida.usuario_cedula,
        propietario_correo: salida.usuario_correo,
        hostname_actual: salida.nuevo_hostname || equipo.hostname_actual,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
 
    // PASO 5: Guardamos snapshot de perifericos en el registro de salida
    const snapshotPerifericos = [
      ...perifericosEquipo.map((p) => ({
        salida_id: salidaGuardada.id,
        periferico_id: p.id,
        tipo: p.tipo, marca: p.marca, modelo: p.modelo, serial: p.serial,
      })),
      ...perifericosSeleccionados.map((p) => ({
        salida_id: salidaGuardada.id,
        periferico_id: p.id,
        tipo: p.tipo, marca: p.marca, modelo: p.modelo, serial: p.serial,
      })),
      ...perifericosNuevos.filter((p) => p.marca).map((p) => ({
        salida_id: salidaGuardada.id,
        periferico_id: null,
        tipo: p.tipo, marca: p.marca, modelo: p.modelo, serial: p.serial,
      })),
    ];
 
    if (snapshotPerifericos.length > 0) {
      await supabase.from("salida_perifericos").insert(snapshotPerifericos);
    }
 
    // PASO 6: Vinculamos perifericos seleccionados al equipo
    if (perifericosSeleccionados.length > 0) {
      await supabase
        .from("perifericos")
        .update({ equipo_id: id })
        .in("id", perifericosSeleccionados.map((p) => p.id));
    }
 
    // PASO 7: Guardamos perifericos nuevos
    const nuevosParaGuardar = perifericosNuevos
      .filter((p) => p.marca)
      .map((p) => ({ ...p, equipo_id: id }));
 
    if (nuevosParaGuardar.length > 0) {
      await supabase.from("perifericos").insert(nuevosParaGuardar);
    }
 
    setPasoActual("");
    router.push(`/equipos/${id}`);
  }
 
  if (loading) return <div className="text-center py-20 text-gray-400">Cargando...</div>;
  if (!equipo) return <div className="text-center py-20 text-red-500">Equipo no encontrado.</div>;
 
  const esMovil = equipo.tipo === "Celular" || equipo.tipo === "Tablet";
  const puedeRegistrarSalida = equipo.estado === "En reserva";
 
  const perifericosDisponiblesFiltrados = perifericosDisponibles
    .filter((p) => !perifericosSeleccionados.find((s) => s.id === p.id))
    .filter((p) => {
      const texto = busquedaPeriferico.toLowerCase();
      return (
        p.tipo?.toLowerCase().includes(texto) ||
        p.marca?.toLowerCase().includes(texto) ||
        p.modelo?.toLowerCase().includes(texto) ||
        p.serial?.toLowerCase().includes(texto)
      );
    });
 
  return (
    <div className="max-w-3xl mx-auto">
 
      {/* ENCABEZADO */}
      <div className="mb-6">
        <a href={`/equipos/${id}`} className="text-blue-600 hover:underline text-sm">
          ← Volver al equipo
        </a>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Registrar salida</h1>
        <p className="text-gray-500 text-sm mt-1">
          Al guardar se generaran automaticamente el acta de entrega y la carta de autorizacion en PDF
        </p>
      </div>
 
      {/* RESUMEN DEL EQUIPO */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-xs text-blue-500 font-semibold mb-1">Equipo a entregar</p>
        <p className="font-bold text-blue-800">{equipo.marca} {equipo.modelo}</p>
        <p className="text-sm text-blue-600 font-mono">{equipo.serial}</p>
        {equipo.hostname_actual && (
          <p className="text-sm text-blue-600 mt-1">Hostname actual: {equipo.hostname_actual}</p>
        )}
      </div>
 
      {/* MENSAJE DE ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}
 
      {/* BLOQUEO SI EL EQUIPO NO ESTA EN RESERVA */}
      {!puedeRegistrarSalida ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-semibold text-gray-700 mb-2">No se puede registrar la salida</p>
          <p className="text-sm text-gray-500 mb-4">
            El equipo debe estar en estado <strong>En reserva</strong> para poder registrar una salida.
            Estado actual: <strong>{equipo.estado}</strong>
          </p>
          <a href={`/equipos/${id}`}
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Volver al equipo
          </a>
        </div>
      ) : (
        <form onSubmit={guardar} className="space-y-6">
 
          {/* SECCION 1: Informacion del nuevo usuario */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              👤 Informacion del nuevo usuario
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input type="text" name="usuario_nombre" value={salida.usuario_nombre} onChange={actualizarCampo}
                  placeholder="Nombre completo del usuario"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cedula <span className="text-red-500">*</span></label>
                <input type="text" name="usuario_cedula" value={salida.usuario_cedula} onChange={actualizarCampo}
                  placeholder="Numero de cedula"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo <span className="text-red-500">*</span></label>
                <input type="email" name="usuario_correo" value={salida.usuario_correo} onChange={actualizarCampo}
                  placeholder="correo@empresa.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo <span className="text-red-500">*</span></label>
                <input type="text" name="usuario_cargo" value={salida.usuario_cargo} onChange={actualizarCampo}
                  placeholder="Cargo del usuario"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Area <span className="text-red-500">*</span></label>
                <input type="text" name="usuario_area" value={salida.usuario_area} onChange={actualizarCampo}
                  placeholder="Area o departamento"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
 
          {/* SECCION 2: Responsable de entrega */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              📦 Informacion del responsable de entrega
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entregado por <span className="text-red-500">*</span></label>
                <input type="text" name="entregado_por" value={salida.entregado_por} onChange={actualizarCampo}
                  placeholder="Nombre de quien entrega"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input type="text" name="ciudad_entrega" value={salida.ciudad_entrega} onChange={actualizarCampo}
                  placeholder="Ciudad de ubicacion"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega</label>
                <input type="date" name="fecha_entrega" value={salida.fecha_entrega} onChange={actualizarCampo}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
 
          {/* SECCION 3: Autorizacion */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              ✅ Autorizacion de salida
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Autorizado por <span className="text-red-500">*</span></label>
                <input type="text" name="autorizado_por" value={salida.autorizado_por} onChange={actualizarCampo}
                  placeholder="Nombre del jefe o responsable que autoriza"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea name="observaciones" value={salida.observaciones} onChange={actualizarCampo}
                  placeholder="Observaciones adicionales..." rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </div>
 
          {/* SECCION 4: Nuevo hostname */}
          {!esMovil && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                🖥 Nuevo hostname
              </h2>
              <input type="text" name="nuevo_hostname" value={salida.nuevo_hostname} onChange={actualizarCampo}
                placeholder="Nuevo hostname del equipo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">Si el hostname cambia, se guardara automaticamente en el historial.</p>
            </div>
          )}
 
          {/* SECCION 5: Perifericos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              🖱 Perifericos para esta entrega
            </h2>
 
            {perifericosEquipo.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 mb-2">Vinculados al equipo (se incluyen automaticamente):</p>
                <div className="flex flex-wrap gap-2">
                  {perifericosEquipo.map((p) => (
                    <span key={p.id} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-200">
                      {p.tipo} - {p.marca} {p.serial ? `(${p.serial})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
 
            {perifericosSeleccionados.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 mb-2">Del inventario seleccionados:</p>
                <div className="space-y-2">
                  {perifericosSeleccionados.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-xs text-blue-600 font-semibold">{p.tipo}</span>
                        <p className="text-sm text-blue-800">{p.marca} {p.modelo || ""} {p.serial ? `(${p.serial})` : ""}</p>
                      </div>
                      <button type="button" onClick={() => quitarSeleccionado(p.id)}
                        className="text-xs text-red-400 hover:text-red-600 ml-3 transition-colors">
                        ✕ Quitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
 
            {perifericosNuevos.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 mb-2">Perifericos nuevos:</p>
                <div className="space-y-4">
                  {perifericosNuevos.map((p, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button type="button" onClick={() => eliminarNuevoPeriferico(index)}
                        className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-sm">
                        ✕ Eliminar
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                          <select value={p.tipo} onChange={(e) => actualizarNuevoPeriferico(index, "tipo", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {TIPOS_PERIFERICO.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
                          <input type="text" value={p.marca} onChange={(e) => actualizarNuevoPeriferico(index, "marca", e.target.value)}
                            placeholder="Marca" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
                          <input type="text" value={p.modelo} onChange={(e) => actualizarNuevoPeriferico(index, "modelo", e.target.value)}
                            placeholder="Modelo" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Serial</label>
                          <input type="text" value={p.serial} onChange={(e) => actualizarNuevoPeriferico(index, "serial", e.target.value)}
                            placeholder="Serial" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
 
            <div className="flex gap-3 flex-wrap">
              <button type="button" onClick={() => setMostrarModalVincular(true)}
                className="flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-4 py-2 rounded-lg transition-colors">
                🔗 Agregar del inventario
              </button>
              <button type="button" onClick={agregarNuevoPeriferico}
                className="flex items-center gap-2 text-sm bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium px-4 py-2 rounded-lg transition-colors">
                + Nuevo periferico
              </button>
            </div>
          </div>
 
          {/* AVISO DE GENERACION DE DOCUMENTOS */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-800 mb-1">📄 Documentos que se generaran automaticamente:</p>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✅ Acta de entrega (PDF) — firmada por el usuario que recibe</li>
              <li>✅ Carta de autorizacion (PDF) — dirigida al jefe autorizante</li>
            </ul>
            <p className="text-xs text-green-600 mt-2">Ambos documentos quedaran disponibles para descarga en el historial del equipo.</p>
          </div>
 
          {/* BOTONES */}
          <div className="flex gap-3 justify-end pb-8">
            <a href={`/equipos/${id}`}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </a>
            <button type="submit" disabled={guardando || !puedeRegistrarSalida}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]">
              {guardando ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="animate-spin">⏳</span>
                  {pasoActual || "Procesando..."}
                </span>
              ) : "Registrar salida"}
            </button>
          </div>
        </form>
      )}
 
      {/* MODAL PARA SELECCIONAR PERIFERICO DEL INVENTARIO */}
      {mostrarModalVincular && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Agregar periferico del inventario</h3>
            <p className="text-sm text-gray-500 mb-4">Selecciona un periferico disponible para incluirlo en esta entrega.</p>
            <input type="text" placeholder="Buscar por tipo, marca, modelo o serial..."
              value={busquedaPeriferico} onChange={(e) => setBusquedaPeriferico(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
            <div className="max-h-72 overflow-y-auto space-y-2">
              {perifericosDisponiblesFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-2xl mb-2">🖱</p>
                  <p className="text-sm">
                    {perifericosDisponibles.length === 0
                      ? "No hay perifericos disponibles en el inventario"
                      : "No se encontraron perifericos con esa busqueda"}
                  </p>
                </div>
              ) : (
                perifericosDisponiblesFiltrados.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                    <div>
                      <p className="text-xs text-purple-600 font-semibold">{p.tipo}</p>
                      <p className="text-sm font-medium text-gray-800">{p.marca} {p.modelo || ""}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.serial || "Sin serial"}</p>
                    </div>
                    <button type="button" onClick={() => seleccionarPeriferico(p)}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                      Seleccionar
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => { setMostrarModalVincular(false); setBusquedaPeriferico(""); }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}