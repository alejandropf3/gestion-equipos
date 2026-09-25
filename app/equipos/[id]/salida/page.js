"use client"; // Este componente corre en el navegador
 
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
 
// Opciones para el tipo de periferico
const TIPOS_PERIFERICO = ["Mouse", "Teclado", "Monitor", "Cargador", "Audifonos", "Docking Station", "Otro"];
 
export default function SalidaEquipo({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise); // Desenvolver params que en Next.js 15 es una promesa
  const { id } = params;
 
  // --- ESTADOS ---
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
 
  // Perifericos ya vinculados al equipo
  const [perifericosEquipo, setPerifericosEquipo] = useState([]);
 
  // Perifericos adicionales que se agregan en esta salida
  const [perifericosAdicionales, setPerifericosAdicionales] = useState([]);
 
  // --- DATOS DEL FORMULARIO DE SALIDA ---
  const [salida, setSalida] = useState({
    usuario_nombre: "",
    usuario_correo: "",
    usuario_cedula: "",
    usuario_cargo: "",
    usuario_area: "",
    entregado_por: "",
    ciudad_entrega: "",
    fecha_entrega: new Date().toISOString().split("T")[0], // Fecha de hoy por defecto
    autorizado_por: "",
    nuevo_hostname: "",
    observaciones: "",
  });
 
  // --- CARGA INICIAL ---
  useEffect(() => {
    async function cargarDatos() {
      // Cargamos los datos del equipo
      const { data: equipoData } = await supabase
        .from("equipos")
        .select("*")
        .eq("id", id)
        .single();
 
      // Cargamos los perifericos vinculados al equipo
      const { data: perifericosData } = await supabase
        .from("perifericos")
        .select("*")
        .eq("equipo_id", id);
 
      setEquipo(equipoData);
      setPerifericosEquipo(perifericosData || []);
 
      // Prellenamos el hostname actual como sugerencia
      if (equipoData?.hostname_actual) {
        setSalida((prev) => ({ ...prev, nuevo_hostname: equipoData.hostname_actual }));
      }
 
      // Si el equipo no esta en reserva, mostramos advertencia desde el inicio
      if (equipoData?.estado !== "En reserva") {
        setError(`Este equipo esta en estado "${equipoData?.estado}" y no puede registrar una salida. Primero debe registrar un ingreso.`);
      }
 
      setLoading(false);
    }
    cargarDatos();
  }, [id]);
 
  // --- ACTUALIZAR CAMPOS DEL FORMULARIO ---
  function actualizarCampo(e) {
    const { name, value } = e.target;
    setSalida((prev) => ({ ...prev, [name]: value }));
  }
 
  // --- MANEJO DE PERIFERICOS ADICIONALES ---
  function agregarPeriferico() {
    setPerifericosAdicionales((prev) => [
      ...prev,
      { tipo: "Mouse", marca: "", modelo: "", serial: "" },
    ]);
  }
 
  function actualizarPeriferico(index, campo, valor) {
    setPerifericosAdicionales((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [campo]: valor } : p))
    );
  }
 
  function eliminarPeriferico(index) {
    setPerifericosAdicionales((prev) => prev.filter((_, i) => i !== index));
  }
 
  // --- GUARDAR SALIDA ---
  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
 
    // Verificamos que el equipo haya cargado antes de validar
    if (!equipo) {
      setError("No se pudo cargar el equipo.");
      setGuardando(false);
      return;
    }
 
    // Bloqueamos la salida si el equipo no esta en estado En reserva
    if (equipo.estado !== "En reserva") {
      setError(`Este equipo esta en estado "${equipo.estado}" y no puede registrar una salida. Primero debe registrar un ingreso.`);
      setGuardando(false);
      return;
    }
 
    // Validacion de campos obligatorios
    if (
      !salida.usuario_nombre ||
      !salida.usuario_cedula ||
      !salida.usuario_correo ||
      !salida.usuario_cargo ||
      !salida.usuario_area ||
      !salida.entregado_por ||
      !salida.autorizado_por
    ) {
      setError("Por favor completa todos los campos obligatorios.");
      setGuardando(false);
      return;
    }
 
    // 1. Guardamos el registro de salida en Supabase
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
      }])
      .select()
      .single();
 
    if (errorSalida) {
      setError("Error al registrar la salida: " + errorSalida.message);
      setGuardando(false);
      return;
    }
 
    // 2. Actualizamos el estado y datos del equipo
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
 
    // 3. Guardamos snapshot de perifericos en el registro de salida
    const todosLosPerifericos = [
      ...perifericosEquipo.map((p) => ({
        salida_id: salidaGuardada.id,
        periferico_id: p.id,
        tipo: p.tipo,
        marca: p.marca,
        modelo: p.modelo,
        serial: p.serial,
      })),
      ...perifericosAdicionales
        .filter((p) => p.marca)
        .map((p) => ({
          salida_id: salidaGuardada.id,
          periferico_id: null,
          tipo: p.tipo,
          marca: p.marca,
          modelo: p.modelo,
          serial: p.serial,
        })),
    ];
 
    if (todosLosPerifericos.length > 0) {
      await supabase.from("salida_perifericos").insert(todosLosPerifericos);
    }
 
    // 4. Guardamos perifericos adicionales nuevos en la tabla perifericos
    const perifericosNuevos = perifericosAdicionales
      .filter((p) => p.marca)
      .map((p) => ({ ...p, equipo_id: id }));
 
    if (perifericosNuevos.length > 0) {
      await supabase.from("perifericos").insert(perifericosNuevos);
    }
 
    // 5. Redirigimos a la inspeccion del equipo
    router.push(`/equipos/${id}`);
  }
 
  // --- FORMATO DE FECHA ---
  // Corregimos el problema de zona horaria agregando T00:00:00
  // para que la fecha no se reste un dia por UTC
  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    return new Date(fecha + "T00:00:00").toLocaleDateString("es-CO", {
      year: "numeric", month: "long", day: "numeric"
    });
  };
 
  if (loading) return <div className="text-center py-20 text-gray-400">Cargando...</div>;
  if (!equipo) return <div className="text-center py-20 text-red-500">Equipo no encontrado.</div>;
 
  const esMovil = equipo.tipo === "Celular" || equipo.tipo === "Tablet";
 
  // Verificamos si el equipo puede registrar salida
  const puedeRegistrarSalida = equipo.estado === "En reserva";
 
  return (
    <div className="max-w-3xl mx-auto">
 
      {/* ENCABEZADO */}
      <div className="mb-6">
        <a href={`/equipos/${id}`} className="text-blue-600 hover:underline text-sm">
          ← Volver al equipo
        </a>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Registrar salida</h1>
        <p className="text-gray-500 text-sm mt-1">
          Completa la informacion de la entrega del equipo al nuevo usuario
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
 
      {/* MENSAJE DE ERROR O ADVERTENCIA */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}
 
      {/* Si el equipo no esta en reserva, mostramos bloqueo y no el formulario */}
      {!puedeRegistrarSalida ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-semibold text-gray-700 mb-2">No se puede registrar la salida</p>
          <p className="text-sm text-gray-500 mb-4">
            El equipo debe estar en estado <strong>En reserva</strong> para poder registrar una salida.
            Estado actual: <strong>{equipo.estado}</strong>
          </p>
          <a
            href={`/equipos/${id}`}
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input type="text" name="usuario_nombre" value={salida.usuario_nombre}
                  onChange={actualizarCampo} placeholder="Nombre completo del usuario"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cedula <span className="text-red-500">*</span>
                </label>
                <input type="text" name="usuario_cedula" value={salida.usuario_cedula}
                  onChange={actualizarCampo} placeholder="Numero de cedula"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo <span className="text-red-500">*</span>
                </label>
                <input type="email" name="usuario_correo" value={salida.usuario_correo}
                  onChange={actualizarCampo} placeholder="correo@empresa.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo <span className="text-red-500">*</span>
                </label>
                <input type="text" name="usuario_cargo" value={salida.usuario_cargo}
                  onChange={actualizarCampo} placeholder="Cargo del usuario"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area <span className="text-red-500">*</span>
                </label>
                <input type="text" name="usuario_area" value={salida.usuario_area}
                  onChange={actualizarCampo} placeholder="Area o departamento"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
 
          {/* SECCION 2: Informacion del responsable de entrega */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              📦 Informacion del responsable de entrega
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entregado por <span className="text-red-500">*</span>
                </label>
                <input type="text" name="entregado_por" value={salida.entregado_por}
                  onChange={actualizarCampo} placeholder="Nombre de quien entrega"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input type="text" name="ciudad_entrega" value={salida.ciudad_entrega}
                  onChange={actualizarCampo} placeholder="Ciudad de ubicacion"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega</label>
                <input type="date" name="fecha_entrega" value={salida.fecha_entrega}
                  onChange={actualizarCampo}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
 
          {/* SECCION 3: Autorizacion de salida */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              ✅ Autorizacion de salida
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Autorizado por <span className="text-red-500">*</span>
                </label>
                <input type="text" name="autorizado_por" value={salida.autorizado_por}
                  onChange={actualizarCampo} placeholder="Nombre del jefe o responsable que autoriza"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea name="observaciones" value={salida.observaciones}
                  onChange={actualizarCampo} placeholder="Observaciones adicionales sobre la entrega..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </div>
 
          {/* SECCION 4: Nuevo hostname (solo para equipos que no son moviles) */}
          {!esMovil && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                🖥 Nuevo hostname
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hostname</label>
                <input type="text" name="nuevo_hostname" value={salida.nuevo_hostname}
                  onChange={actualizarCampo} placeholder="Nuevo hostname del equipo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">
                  Si el hostname cambia, se guardara automaticamente en el historial.
                </p>
              </div>
            </div>
          )}
 
          {/* SECCION 5: Perifericos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              🖱 Elementos adicionales (perifericos)
            </h2>
 
            {/* Perifericos ya vinculados al equipo */}
            {perifericosEquipo.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Perifericos vinculados al equipo:</p>
                <div className="flex flex-wrap gap-2">
                  {perifericosEquipo.map((p) => (
                    <span key={p.id} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full">
                      {p.tipo} - {p.marca} {p.serial ? `(${p.serial})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
 
            {/* Perifericos adicionales */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">Agregar perifericos adicionales para esta entrega:</p>
              <button type="button" onClick={agregarPeriferico}
                className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-3 py-1.5 rounded-lg transition-colors">
                + Agregar
              </button>
            </div>
 
            {perifericosAdicionales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">
                No se han agregado perifericos adicionales.
              </p>
            ) : (
              <div className="space-y-4">
                {perifericosAdicionales.map((p, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                    <button type="button" onClick={() => eliminarPeriferico(index)}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-sm">
                      ✕ Eliminar
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                        <select value={p.tipo} onChange={(e) => actualizarPeriferico(index, "tipo", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {TIPOS_PERIFERICO.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
                        <input type="text" value={p.marca}
                          onChange={(e) => actualizarPeriferico(index, "marca", e.target.value)}
                          placeholder="Marca" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
                        <input type="text" value={p.modelo}
                          onChange={(e) => actualizarPeriferico(index, "modelo", e.target.value)}
                          placeholder="Modelo" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Serial</label>
                        <input type="text" value={p.serial}
                          onChange={(e) => actualizarPeriferico(index, "serial", e.target.value)}
                          placeholder="Serial" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
 
          {/* BOTONES de accion */}
          <div className="flex gap-3 justify-end pb-8">
            <a href={`/equipos/${id}`}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </a>
            <button type="submit"
              disabled={guardando || !puedeRegistrarSalida}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {guardando ? "Registrando..." : "Registrar salida"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}