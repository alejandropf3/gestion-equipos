"use client"; // Este componente corre en el navegador
 
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
 
// Opciones fijas para los selectores del formulario
const TIPOS_EQUIPO = ["Laptop", "Desktop", "Celular", "Tablet", "Servidor", "Otro"];
 
export default function EditarEquipo({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise); // Desenvolver params que en Next.js 15 es una promesa
  const { id } = params;
 
  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);   // Controla la carga inicial
  const [guardando, setGuardando] = useState(false); // Controla el boton de guardar
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false); // Muestra mensaje de exito al guardar
 
  // Estado con todos los campos editables del equipo
  const [equipo, setEquipo] = useState({
    tipo: "Laptop",
    marca: "",
    modelo: "",
    serial: "",
    numero_inventario: "",
    procesador: "",
    memoria_ram: "",
    almacenamiento: "",
    sistema_operativo: "",
    licencia_office: "",
    antivirus: "",
    imei_1: "",
    imei_2: "",
    version_so: "",
    hostname_actual: "",
    estado: "En reserva",
    propietario_nombre: "",
    propietario_cedula: "",
    propietario_correo: "",
    recibido_por: "",
    ciudad_recepcion: "",
  });
 
  // --- CARGA INICIAL ---
  // Trae los datos actuales del equipo para prellenar el formulario
  useEffect(() => {
    async function cargarEquipo() {
      const { data, error } = await supabase
        .from("equipos")
        .select("*")
        .eq("id", id)
        .single();
 
      if (error || !data) {
        setError("No se pudo cargar el equipo.");
        setLoading(false);
        return;
      }
 
      // Prellenamos el formulario con los datos actuales del equipo
      setEquipo({
        tipo: data.tipo || "Laptop",
        marca: data.marca || "",
        modelo: data.modelo || "",
        serial: data.serial || "",
        numero_inventario: data.numero_inventario || "",
        procesador: data.procesador || "",
        memoria_ram: data.memoria_ram || "",
        almacenamiento: data.almacenamiento || "",
        sistema_operativo: data.sistema_operativo || "",
        licencia_office: data.licencia_office || "",
        antivirus: data.antivirus || "",
        imei_1: data.imei_1 || "",
        imei_2: data.imei_2 || "",
        version_so: data.version_so || "",
        hostname_actual: data.hostname_actual || "",
        estado: data.estado || "En reserva",
        propietario_nombre: data.propietario_nombre || "",
        propietario_cedula: data.propietario_cedula || "",
        propietario_correo: data.propietario_correo || "",
        recibido_por: data.recibido_por || "",
        ciudad_recepcion: data.ciudad_recepcion || "",
      });
 
      setLoading(false);
    }
 
    cargarEquipo();
  }, [id]);
 
  // --- ACTUALIZAR CAMPOS ---
  function actualizarCampo(e) {
    const { name, value } = e.target;
    setEquipo((prev) => ({ ...prev, [name]: value }));
  }
 
  // --- GUARDAR CAMBIOS ---
  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setExito(false);
 
    // Validacion de campos obligatorios
    if (!equipo.serial || !equipo.marca || !equipo.modelo || !equipo.tipo) {
      setError("Por favor completa los campos obligatorios: Tipo, Marca, Modelo y Serial.");
      setGuardando(false);
      return;
    }
 
    // Actualizamos el equipo en Supabase
    // El trigger de hostname_historial detectara automaticamente si cambio el hostname
    const { error: errorUpdate } = await supabase
      .from("equipos")
      .update({
        ...equipo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
 
    if (errorUpdate) {
      setError("Error al guardar: " + errorUpdate.message);
      setGuardando(false);
      return;
    }
 
    // Mostramos mensaje de exito y redirigimos a la inspeccion del equipo
    setExito(true);
    setTimeout(() => {
      router.push(`/equipos/${id}`);
    }, 1500);
  }
 
  // Verificamos si el tipo de equipo es movil para mostrar campos de IMEI
  const esMovil = equipo.tipo === "Celular" || equipo.tipo === "Tablet";
 
  if (loading) return <div className="text-center py-20 text-gray-400">Cargando...</div>;
 
  return (
    <div className="max-w-3xl mx-auto">
 
      {/* ENCABEZADO */}
      <div className="mb-6">
        <a href={`/equipos/${id}`} className="text-blue-600 hover:underline text-sm">
          ← Volver al equipo
        </a>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Editar equipo</h1>
        <p className="text-gray-500 text-sm mt-1">
          Modifica la informacion del equipo. El historial de ingresos y salidas no se puede editar.
        </p>
      </div>
 
      {/* MENSAJE DE ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}
 
      {/* MENSAJE DE EXITO */}
      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mb-6 text-sm">
          ✅ Cambios guardados correctamente. Redirigiendo...
        </div>
      )}
 
      <form onSubmit={guardar} className="space-y-6">
 
        {/* SECCION 1: Datos del equipo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            📋 Datos del equipo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo"
                value={equipo.tipo}
                onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS_EQUIPO.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="marca"
                value={equipo.marca}
                onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="modelo"
                value={equipo.modelo}
                onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="serial"
                value={equipo.serial}
                onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numero de inventario
              </label>
              <input
                type="text"
                name="numero_inventario"
                value={equipo.numero_inventario}
                onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            {/* Estado del equipo - editable manualmente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                name="estado"
                value={equipo.estado}
                onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>En reserva</option>
                <option>Entregado</option>
                <option>Prestado</option>
              </select>
            </div>
 
            {/* Hostname solo para equipos que no son moviles */}
            {!esMovil && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hostname
                </label>
                <input
                  type="text"
                  name="hostname_actual"
                  value={equipo.hostname_actual}
                  onChange={actualizarCampo}
                  placeholder="Ej: PC-JUAN"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Si cambias el hostname se guardara en el historial automaticamente.
                </p>
              </div>
            )}
          </div>
        </div>
 
        {/* SECCION 2: Especificaciones tecnicas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            ⚙️ Especificaciones tecnicas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Procesador</label>
              <input type="text" name="procesador" value={equipo.procesador} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Memoria RAM</label>
              <input type="text" name="memoria_ram" value={equipo.memoria_ram} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Almacenamiento</label>
              <input type="text" name="almacenamiento" value={equipo.almacenamiento} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sistema Operativo</label>
              <input type="text" name="sistema_operativo" value={equipo.sistema_operativo} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Licencia Office</label>
              <input type="text" name="licencia_office" value={equipo.licencia_office} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Antivirus</label>
              <input type="text" name="antivirus" value={equipo.antivirus} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
 
            {/* Campos exclusivos para Celular y Tablet */}
            {esMovil && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version S.O.</label>
                  <input type="text" name="version_so" value={equipo.version_so} onChange={actualizarCampo}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IMEI 1</label>
                  <input type="text" name="imei_1" value={equipo.imei_1} onChange={actualizarCampo}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IMEI 2</label>
                  <input type="text" name="imei_2" value={equipo.imei_2} onChange={actualizarCampo}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </>
            )}
          </div>
        </div>
 
        {/* SECCION 3: Informacion del responsable */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            👤 Informacion del responsable
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" name="propietario_nombre" value={equipo.propietario_nombre} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cedula</label>
              <input type="text" name="propietario_cedula" value={equipo.propietario_cedula} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input type="email" name="propietario_correo" value={equipo.propietario_correo} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
 
        {/* SECCION 4: Informacion de recepcion */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            📦 Informacion de recepcion
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recibido por</label>
              <input type="text" name="recibido_por" value={equipo.recibido_por} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input type="text" name="ciudad_recepcion" value={equipo.ciudad_recepcion} onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
 
        {/* BOTONES de accion */}
        <div className="flex gap-3 justify-end pb-8">
          <a
            href={`/equipos/${id}`}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}