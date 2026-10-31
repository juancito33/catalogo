import { useEffect, useMemo, useState } from 'react'

// Los precios y la configuración vienen de n8n (ahí están guardados los precios mayoristas, que no se publican).
const DATOS = 'https://n8n.srv894441.hstgr.cloud/webhook/catalogo-datos'
const BASE = import.meta.env.BASE_URL
const FOTOS = BASE + 'fotos/'

const pesos = (n) => '$' + Number(n).toLocaleString('es-CO')

function catalogoPedido() {
  return new URLSearchParams(location.search).get('c') || 'principal'
}

export default function App() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todo')
  const [pedido, setPedido] = useState({}) // id -> cantidad
  const [verPedido, setVerPedido] = useState(false)
  const [ampliada, setAmpliada] = useState(null)

  useEffect(() => {
    fetch(DATOS + '?c=' + encodeURIComponent(catalogoPedido()))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setDatos(d)
        // cada proveedor tiene su estilo (colores de la portada de su catálogo)
        document.documentElement.dataset.tema = d.lista || 'barberia'
        document.title = d.tienda || (d.lista === 'ibe' ? 'Catálogo de productos IBE' : 'Catálogo')
      })
      .catch(() => setError(true))
  }, [])

  const productos = datos?.productos || []
  const categorias = useMemo(() => ['Todo', ...new Set(productos.map((p) => p.categoria))], [productos])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter(
      (p) =>
        (categoria === 'Todo' || p.categoria === categoria) &&
        (!q || (p.nombre + ' ' + p.descripcion + ' ' + p.categoria).toLowerCase().includes(q))
    )
  }, [productos, busqueda, categoria])

  const enPedido = productos.filter((p) => pedido[p.id])
  const total = enPedido.reduce((s, p) => s + p.precio * pedido[p.id], 0)
  const unidades = enPedido.reduce((s, p) => s + pedido[p.id], 0)

  const cambiar = (id, delta) =>
    setPedido((ped) => {
      const n = Math.max(0, (ped[id] || 0) + delta)
      const copia = { ...ped }
      if (n) copia[id] = n
      else delete copia[id]
      return copia
    })

  const whatsapp = (texto) =>
    datos?.whatsapp ? `https://wa.me/${datos.whatsapp}?text=${encodeURIComponent(texto)}` : null

  const mensajePedido =
    'Hola, quiero hacer este pedido:\n' +
    enPedido.map((p) => `• ${pedido[p.id]} x ${p.nombre} (#${p.id}) - ${pesos(p.precio * pedido[p.id])}`).join('\n') +
    `\nTotal: ${pesos(total)}`

  if (error)
    return (
      <div className="aviso">
        <h1>Catálogo no disponible</h1>
        <p>No pudimos cargar los productos. Intenta de nuevo en un momento.</p>
      </div>
    )
  if (!datos)
    return (
      <div className="aviso">
        <div className="cargando" />
        <p>Cargando catálogo…</p>
      </div>
    )

  return (
    <>
      {datos.lista === 'ibe' ? (
        <header className="portada">
          <img className="logo" src={BASE + 'ibe/logo.svg'} width="1100" height="660" alt="IBE Importadora y Distribuidora" />
          <div className="ola">
            <h1>Catálogo</h1>
            <span>de productos</span>
          </div>
          {(datos.tienda || datos.mensaje) && (
            <p className="tienda">
              {datos.tienda && <strong>{datos.tienda}</strong>} {datos.mensaje}
            </p>
          )}
        </header>
      ) : (
        <header className="marca">
          <h1>{datos.tienda || 'Catálogo'}</h1>
          {datos.mensaje && <p>{datos.mensaje}</p>}
        </header>
      )}
      <div className="cabecera">
        <input
          className="buscar"
          type="search"
          placeholder="Buscar producto, marca o referencia…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <nav className="categorias">
          {categorias.map((c) => (
            <button
              key={c}
              className={c === categoria ? 'activa' : ''}
              onClick={(e) => {
                setCategoria(c)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
              }}
            >
              {c}
            </button>
          ))}
        </nav>
      </div>

      <main className="rejilla">
        {visibles.map((p) => (
          <article key={p.id} className={'tarjeta' + (p.agotado ? ' agotado' : '')}>
            <button className="foto" onClick={() => p.foto && setAmpliada(p)} aria-label={'Ver foto de ' + p.nombre}>
              {p.foto ? <img src={FOTOS + p.foto} alt={p.nombre} loading="lazy" /> : <span>Sin foto</span>}
              {p.agotado && <span className="sello">Agotado</span>}
            </button>
            <div className="info">
              <span className="ref">#{p.id} · {p.categoria}</span>
              <h2>{p.nombre}</h2>
              {p.descripcion && <p className="desc">{p.descripcion}</p>}
              <div className="pie">
                <strong className="precio">{p.agotado ? 'Agotado' : pesos(p.precio)}</strong>
                {!p.agotado &&
                  (pedido[p.id] ? (
                    <div className="cantidad">
                      <button onClick={() => cambiar(p.id, -1)} aria-label="Quitar uno">−</button>
                      <span>{pedido[p.id]}</span>
                      <button onClick={() => cambiar(p.id, 1)} aria-label="Agregar uno">+</button>
                    </div>
                  ) : (
                    <button className="agregar" onClick={() => cambiar(p.id, 1)}>Agregar</button>
                  ))}
              </div>
            </div>
          </article>
        ))}
        {!visibles.length && <p className="vacio">No encontramos productos con esa búsqueda.</p>}
      </main>

      <footer className="final">
        {datos.whatsapp && (
          <a href={whatsapp('Hola, vi tu catálogo y quiero más información.')} target="_blank" rel="noreferrer">
            Escríbenos por WhatsApp
          </a>
        )}
        <p>Precios sujetos a cambios y a disponibilidad.</p>
      </footer>

      {unidades > 0 && (
        <button className="barra-pedido" onClick={() => setVerPedido(true)}>
          <span>{unidades} {unidades === 1 ? 'producto' : 'productos'}</span>
          <strong>{pesos(total)} · Ver pedido</strong>
        </button>
      )}

      {verPedido && (
        <div className="fondo" onClick={() => setVerPedido(false)}>
          <section className="panel" onClick={(e) => e.stopPropagation()}>
            <h2>Tu pedido</h2>
            <ul>
              {enPedido.map((p) => (
                <li key={p.id}>
                  <span>{p.nombre}</span>
                  <div className="cantidad">
                    <button onClick={() => cambiar(p.id, -1)}>−</button>
                    <span>{pedido[p.id]}</span>
                    <button onClick={() => cambiar(p.id, 1)}>+</button>
                  </div>
                  <strong>{pesos(p.precio * pedido[p.id])}</strong>
                </li>
              ))}
            </ul>
            <p className="total">Total: <strong>{pesos(total)}</strong></p>
            {datos.whatsapp ? (
              <a className="enviar" href={whatsapp(mensajePedido)} target="_blank" rel="noreferrer">
                Enviar pedido por WhatsApp
              </a>
            ) : (
              <p className="nota">Pronto podrás enviar tu pedido por WhatsApp.</p>
            )}
            <button className="cerrar" onClick={() => setVerPedido(false)}>Seguir viendo</button>
          </section>
        </div>
      )}

      {ampliada && (
        <div className="fondo" onClick={() => setAmpliada(null)}>
          <figure className="ampliada">
            <img src={FOTOS + ampliada.foto} alt={ampliada.nombre} />
            <figcaption>{ampliada.nombre}</figcaption>
          </figure>
        </div>
      )}
    </>
  )
}
