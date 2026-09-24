"use client"; // Este componente corre en el navegador
 
// Importamos hooks de React
// useState: para manejar los datos del formulario
// useRouter: para redirigir al usuario despues de guardar
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
 
// Opciones fijas para los selectores del formulario
const TIPOS_EQUIPO = ["Laptop", "Desktop", "Celular", "Tablet", "Servidor", "Otro"];
const TIPOS_PERIFERICO = ["Mouse", "Teclado", "Monitor", "Cargador", "Audifonos", "Docking Station", "Otro"];
 
export default function NuevoEquipo() {
  const router = useRouter(); // Para redirigir despues de guardar
  const [loading, setLoading] = useState(false); // Controla el boton de guardar
  const [error, setError] = useState(""); // Mensaje de error si algo falla
 
  // --- DATOS DEL EQUIPO ---
  // Estado que guarda todos los campos del formulario principal
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
    // Campos exclusivos de Celular/Tablet
    imei_1: "",
    imei_2: "",
    version_so: "",
    // Hostname (no aplica para Celular/Tablet)
    hostname_actual: "",
    // Informacion del responsable inicial
    propietario_nombre: "",
    propietario_cedula: "",
    propietario_correo: "",
    // Informacion de quien recibe el equipo en el inventario
    recibido_por: "",
    ciudad_recepcion: "",
    fecha_ingreso: new Date().toISOString().split("T")[0], // Fecha de hoy por defecto
  });
 
  // --- PERIFERICOS ---
  // Lista de perifericos que se pueden agregar al equipo
  const [perifericos, setPerifericos] = useState([]);
 
  // Funcion para actualizar un campo del formulario principal
  // Usa el nombre del campo (name) para saber cual actualizar
  function actualizarCampo(e) {
    const { name, value } = e.target;
    setEquipo((prev) => ({ ...prev, [name]: value }));
  }
 
  // --- MANEJO DE PERIFERICOS ---
 
  // Agrega un periferico vacio a la lista
  function agregarPeriferico() {
    setPerifericos((prev) => [
      ...prev,
      { tipo: "Mouse", marca: "", modelo: "", serial: "" },
    ]);
  }
 
  // Actualiza un campo de un periferico especifico por su indice en la lista
  function actualizarPeriferico(index, campo, valor) {
    setPerifericos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [campo]: valor } : p))
    );
  }
 
  // Elimina un periferico de la lista por su indice
  function eliminarPeriferico(index) {
    setPerifericos((prev) => prev.filter((_, i) => i !== index));
  }
 
  // --- GUARDAR EN SUPABASE ---
 
  async function guardar(e) {
    e.preventDefault(); // Evita que el formulario recargue la pagina
    setLoading(true);
    setError("");
 
    // Verificamos que los campos obligatorios esten completos
    if (!equipo.serial || !equipo.marca || !equipo.modelo || !equipo.tipo) {
      setError("Por favor completa los campos obligatorios: Tipo, Marca, Modelo y Serial.");
      setLoading(false);
      return;
    }
 
    // 1. Insertamos el equipo en la tabla equipos
    const { data: equipoGuardado, error: errorEquipo } = await supabase
      .from("equipos")
      .insert([{
        ...equipo,
        estado: "En reserva", // Todo equipo nuevo empieza en reserva
        usuario_actual: equipo.propietario_nombre || null,
      }])
      .select() // Retorna el registro insertado para obtener su ID
      .single();
 
    if (errorEquipo) {
      setError("Error al guardar el equipo: " + errorEquipo.message);
      setLoading(false);
      return;
    }
 
    // 2. Guardamos el registro de ingreso en la tabla registros_ingreso
    await supabase.from("registros_ingreso").insert([{
      equipo_id: equipoGuardado.id,
      hostname: equipo.hostname_actual,
      recibido_por: equipo.recibido_por,
      ciudad_recepcion: equipo.ciudad_recepcion,
      fecha_recepcion: equipo.fecha_ingreso,
      propietario_nombre: equipo.propietario_nombre,
      propietario_cedula: equipo.propietario_cedula,
      propietario_correo: equipo.propietario_correo,
    }]);
 
    // 3. Si hay perifericos, los guardamos en la tabla perifericos
    // y los vinculamos al equipo recien creado
    if (perifericos.length > 0) {
      const perifericosConEquipo = perifericos
        .filter((p) => p.marca) // Solo guardamos perifericos que tengan marca
        .map((p) => ({ ...p, equipo_id: equipoGuardado.id }));
 
      if (perifericosConEquipo.length > 0) {
        const { data: perifericosGuardados } = await supabase
          .from("perifericos")
          .insert(perifericosConEquipo)
          .select();
 
        // 4. Guardamos el historial de perifericos vinculados al ingreso
        if (perifericosGuardados) {
          const ingresoId = await supabase
            .from("registros_ingreso")
            .select("id")
            .eq("equipo_id", equipoGuardado.id)
            .single();
 
          if (ingresoId.data) {
            await supabase.from("ingreso_perifericos").insert(
              perifericosGuardados.map((p) => ({
                ingreso_id: ingresoId.data.id,
                periferico_id: p.id,
                tipo: p.tipo,
                marca: p.marca,
                modelo: p.modelo,
                serial: p.serial,
              }))
            );
          }
        }
      }
    }
 
    // Todo salio bien, redirigimos al listado principal
    router.push("/");
  }
 
  // Verificamos si el tipo de equipo es movil para mostrar campos de IMEI
  const esMovil = equipo.tipo === "Celular" || equipo.tipo === "Tablet";
 
  return (
    <div className="max-w-3xl mx-auto">
 
      {/* ENCABEZADO de la pagina */}
      <div className="mb-6">
        <a href="/" className="text-blue-600 hover:underline text-sm">
          ← Volver al listado
        </a>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">
          Registrar nuevo equipo
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Completa la informacion del equipo que ingresa al inventario
        </p>
      </div>
 
      {/* MENSAJE DE ERROR si algo falla al guardar */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}
 
      {/* FORMULARIO PRINCIPAL */}
      <form onSubmit={guardar} className="space-y-6">
 
        {/* SECCION 1: Datos del equipo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            📋 Datos del equipo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 
            {/* Selector de tipo de equipo - controla que campos adicionales se muestran */}
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
                placeholder="Ej: Dell, HP, Lenovo"
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
                placeholder="Ej: Latitude 5420"
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
                placeholder="Numero de serie del fabricante"
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
                placeholder="Codigo interno de inventario"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            {/* Hostname solo aparece si NO es movil */}
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
              <input
                type="text"
                name="procesador"
                value={equipo.procesador}
                onChange={actualizarCampo}
                placeholder="Ej: Intel Core i5-1135G7"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Memoria RAM</label>
              <input
                type="text"
                name="memoria_ram"
                value={equipo.memoria_ram}
                onChange={actualizarCampo}
                placeholder="Ej: 8GB DDR4"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Almacenamiento</label>
              <input
                type="text"
                name="almacenamiento"
                value={equipo.almacenamiento}
                onChange={actualizarCampo}
                placeholder="Ej: 256GB SSD"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sistema Operativo</label>
              <input
                type="text"
                name="sistema_operativo"
                value={equipo.sistema_operativo}
                onChange={actualizarCampo}
                placeholder="Ej: Windows 11 Pro"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Licencia Office</label>
              <input
                type="text"
                name="licencia_office"
                value={equipo.licencia_office}
                onChange={actualizarCampo}
                placeholder="Ej: Microsoft 365"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Antivirus</label>
              <input
                type="text"
                name="antivirus"
                value={equipo.antivirus}
                onChange={actualizarCampo}
                placeholder="Ej: Windows Defender"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            {/* Campos exclusivos para Celular y Tablet */}
            {esMovil && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version S.O.</label>
                  <input
                    type="text"
                    name="version_so"
                    value={equipo.version_so}
                    onChange={actualizarCampo}
                    placeholder="Ej: Android 13"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IMEI 1</label>
                  <input
                    type="text"
                    name="imei_1"
                    value={equipo.imei_1}
                    onChange={actualizarCampo}
                    placeholder="IMEI principal"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IMEI 2</label>
                  <input
                    type="text"
                    name="imei_2"
                    value={equipo.imei_2}
                    onChange={actualizarCampo}
                    placeholder="IMEI secundario (opcional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
              <input
                type="text"
                name="propietario_nombre"
                value={equipo.propietario_nombre}
                onChange={actualizarCampo}
                placeholder="Nombre completo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cedula</label>
              <input
                type="text"
                name="propietario_cedula"
                value={equipo.propietario_cedula}
                onChange={actualizarCampo}
                placeholder="Numero de cedula"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                name="propietario_correo"
                value={equipo.propietario_correo}
                onChange={actualizarCampo}
                placeholder="correo@empresa.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recibido por <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="recibido_por"
                value={equipo.recibido_por}
                onChange={actualizarCampo}
                placeholder="Nombre de quien recibe"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input
                type="text"
                name="ciudad_recepcion"
                value={equipo.ciudad_recepcion}
                onChange={actualizarCampo}
                placeholder="Ciudad de ubicacion"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de ingreso</label>
              <input
                type="date"
                name="fecha_ingreso"
                value={equipo.fecha_ingreso}
                onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
 
        {/* SECCION 5: Perifericos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-700">
              🖱 Elementos adicionales (perifericos)
            </h2>
            {/* Boton para agregar un nuevo periferico a la lista */}
            <button
              type="button"
              onClick={agregarPeriferico}
              className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              + Agregar
            </button>
          </div>
 
          {/* Si no hay perifericos muestra un mensaje */}
          {perifericos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No se han agregado perifericos. Haz clic en "+ Agregar" para incluir uno.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Renderiza un formulario por cada periferico en la lista */}
              {perifericos.map((p, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 relative"
                >
                  {/* Boton para eliminar este periferico */}
                  <button
                    type="button"
                    onClick={() => eliminarPeriferico(index)}
                    className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-sm"
                  >
                    ✕ Eliminar
                  </button>
 
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                      <select
                        value={p.tipo}
                        onChange={(e) => actualizarPeriferico(index, "tipo", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {TIPOS_PERIFERICO.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
 
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
                      <input
                        type="text"
                        value={p.marca}
                        onChange={(e) => actualizarPeriferico(index, "marca", e.target.value)}
                        placeholder="Marca del periferico"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
 
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
                      <input
                        type="text"
                        value={p.modelo}
                        onChange={(e) => actualizarPeriferico(index, "modelo", e.target.value)}
                        placeholder="Modelo del periferico"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
 
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Serial</label>
                      <input
                        type="text"
                        value={p.serial}
                        onChange={(e) => actualizarPeriferico(index, "serial", e.target.value)}
                        placeholder="Serial del periferico"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
 
        {/* BOTONES de accion: cancelar o guardar */}
        <div className="flex gap-3 justify-end pb-8">
          <a
            href="/"
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Registrar equipo"}
          </button>
        </div>
      </form>
    </div>
  );
}