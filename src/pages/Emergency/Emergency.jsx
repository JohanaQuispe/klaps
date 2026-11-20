import { useCallback, useEffect, useState } from 'react'
import { Copy, MapPin, MessageCircle, Phone, Save, Search, Send, ShieldAlert, Siren, Trash2 } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Toggle from '../../components/common/Toggle'
import ErrorMessage from '../../components/common/ErrorMessage'
import StatusBadge from '../../components/common/StatusBadge'
import { useAccessibility } from '../../context/accessibilityContext.js'
import { EMERGENCY_GESTURES } from '../../context/accessibilityOptions.js'
import { useClipboard } from '../../hooks/useClipboard.js'
import {
  buildAlertMessage,
  isEmergencyChannelReady,
  requestLocation,
  sendAlert,
} from '../../services/emergency/sos.js'
import {
  clearTelegramConfig,
  fetchTelegramChats,
  isValidChatId,
  isValidToken,
  loadTelegramConfig,
  normalizeChatId,
  normalizeToken,
  saveTelegramConfig,
  sendTelegramTest,
} from '../../services/emergency/telegram.js'

const COUNTDOWN_START = 5

export default function Emergency() {
  const { preferences, updatePreference } = useAccessibility()
  const { copy, copied, error: copyError } = useClipboard()

  const [phase, setPhase] = useState('idle') // idle | confirm | countdown | sending
  const [countdown, setCountdown] = useState(COUNTDOWN_START)
  const [result, setResult] = useState(null)
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [locating, setLocating] = useState(false)

  const [contactName, setContactName] = useState(preferences.emergencyContact?.name ?? '')
  const [contactPhone, setContactPhone] = useState(preferences.emergencyContact?.phone ?? '')
  const [contactSaved, setContactSaved] = useState(false)

  // ── Telegram ──
  const [telegram, setTelegram] = useState(loadTelegramConfig)
  const [tokenInput, setTokenInput] = useState(() => loadTelegramConfig().token)
  const [chatInput, setChatInput] = useState(() => loadTelegramConfig().chatId)
  const [chats, setChats] = useState([])
  const [telegramMessage, setTelegramMessage] = useState('')
  const [telegramError, setTelegramError] = useState('')
  const [searching, setSearching] = useState(false)
  const [testingSend, setTestingSend] = useState(false)

  const channelReady = isEmergencyChannelReady(telegram)

  const gestureLabel =
    EMERGENCY_GESTURES.find((item) => item.value === preferences.emergencyGesture)?.label ?? ''

  const runAlert = useCallback(async () => {
    setPhase('sending')

    let currentLocation = location
    let locationMessage = locationError

    if (preferences.shareLocation && !currentLocation) {
      const response = await requestLocation()
      if (response.location) {
        currentLocation = response.location
        setLocation(response.location)
        locationMessage = ''
      } else {
        locationMessage = response.error
        setLocationError(response.error)
      }
    }

    const message = buildAlertMessage({
      contactName: preferences.emergencyContact?.name,
      location: currentLocation,
      gesture: preferences.emergencyGesture === 'sin-gesto' ? null : gestureLabel,
    })

    const response = await sendAlert({
      message,
      contact: preferences.emergencyContact,
      telegram,
    })

    setResult({ ...response, message, location: currentLocation, locationError: locationMessage })
    setPhase('idle')
  }, [location, locationError, preferences, gestureLabel, telegram])

  // Cuenta atrás antes de preparar la alerta (el disparo ocurre en el temporizador,
  // no de forma síncrona durante el render)
  useEffect(() => {
    if (phase !== 'countdown') return undefined
    const timer = window.setTimeout(() => {
      if (countdown > 1) setCountdown(countdown - 1)
      else runAlert()
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [phase, countdown, runAlert])

  const startFlow = () => {
    setResult(null)
    setCountdown(COUNTDOWN_START)
    setPhase('confirm')
  }

  const cancelFlow = () => {
    setPhase('idle')
    setCountdown(COUNTDOWN_START)
  }

  const saveContact = () => {
    updatePreference('emergencyContact', {
      name: contactName.trim(),
      phone: contactPhone.trim(),
    })
    setContactSaved(true)
    window.setTimeout(() => setContactSaved(false), 2500)
  }

  const saveTelegram = () => {
    const token = normalizeToken(tokenInput)
    const chatId = normalizeChatId(chatInput)

    if (!isValidToken(token)) {
      setTelegramError('El token no tiene el formato correcto. Cópialo de @BotFather: 123456789:AA…')
      return
    }
    if (!isValidChatId(chatId)) {
      setTelegramError('Pulsa «Buscar contactos» y elige uno, o escribe el ID numérico del chat.')
      return
    }

    const next = {
      token,
      chatId,
      chatName: chats.find((chat) => chat.id === chatId)?.name ?? '',
    }
    setTelegram(saveTelegramConfig(next))
    setTelegramError('')
    setTelegramMessage('Telegram guardado: la alerta SOS se enviará a este chat.')
  }

  const removeTelegram = () => {
    setTelegram(clearTelegramConfig())
    setTokenInput('')
    setChatInput('')
    setChats([])
    setTelegramError('')
    setTelegramMessage('Configuración de Telegram eliminada de este navegador.')
  }

  const searchChats = async () => {
    const token = normalizeToken(tokenInput)
    if (!isValidToken(token)) {
      setTelegramError('Escribe primero el token del bot para buscar contactos.')
      return
    }

    setSearching(true)
    setTelegramError('')
    setTelegramMessage('')

    const response = await fetchTelegramChats(token)
    setSearching(false)

    if (!response.ok) {
      setTelegramError(response.error)
      return
    }

    setChats(response.chats)
    if (response.chats.length === 0) {
      setTelegramError(response.error)
    } else {
      setTelegramMessage(`Se encontraron ${response.chats.length} chats que escribieron al bot.`)
    }
  }

  const testTelegram = async () => {
    const config = { token: normalizeToken(tokenInput), chatId: normalizeChatId(chatInput) }

    if (!isValidToken(config.token) || !isValidChatId(config.chatId)) {
      setTelegramError('Guarda antes el token y el contacto de Telegram.')
      return
    }

    setTestingSend(true)
    setTelegramError('')
    setTelegramMessage('Enviando mensaje de prueba…')

    const response = await sendTelegramTest(config)
    setTestingSend(false)

    if (response.delivered) {
      setTelegramMessage('Prueba enviada: revisa el chat del contacto en Telegram.')
    } else {
      setTelegramMessage('')
      setTelegramError(response.reason)
    }
  }

  const testLocation = async () => {
    setLocating(true)
    setLocationError('')
    const response = await requestLocation()
    if (response.location) setLocation(response.location)
    else setLocationError(response.error)
    setLocating(false)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Emergencia"
        title="Emergencia SOS"
        description="Pide ayuda en dos pasos, con confirmación previa. KLAPS nunca envía nada sin tu permiso."
        actions={
          <StatusBadge
            status={channelReady ? 'conectado' : 'pendiente'}
            label={channelReady ? 'Telegram conectado' : 'Sin canal conectado'}
          />
        }
      />

      {!channelReady && (
        <ErrorMessage
          className="mb-5"
          title="Todavía no hay un canal conectado"
          description="Configura tu bot de Telegram y elige el contacto más abajo. Sin eso KLAPS prepara el mensaje pero no lo envía: nunca se simula una alerta enviada."
        />
      )}

      {/* Botón SOS */}
      <Card padding="lg" className="border-danger/30 bg-white">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <img
            src="/illustrations/sos.webp"
            alt=""
            aria-hidden="true"
            className="h-24 w-auto shrink-0 object-contain sm:h-32"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold text-brand-800">
              Pedir ayuda ahora
            </h2>
            <p className="mt-1 max-w-prose text-sm text-ink-soft">
              Se te pedirá confirmación y una cuenta atrás de {COUNTDOWN_START} segundos que puedes
              cancelar en cualquier momento.
            </p>
          </div>
        </div>

        <Button
          variant="danger"
          size="lg"
          fullWidth
          icon={Siren}
          className="mt-5 min-h-16 text-xl"
          onClick={startFlow}
        >
          Activar SOS
        </Button>
      </Card>

      {/* Resultado del último intento */}
      {result && (
        <Card padding="lg" className="mt-5 border-warning/40 bg-warning-soft">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-6 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-display text-lg font-extrabold text-brand-800">
                {result.delivered ? (
                  <span className="text-success">Alerta enviada por Telegram</span>
                ) : (
                  <>
                    Alerta preparada, <span className="text-warning">no enviada</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-sm text-ink">{result.reason}</p>

              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex flex-wrap gap-1">
                  <dt className="font-semibold text-ink">Destino:</dt>
                  <dd className="text-ink-soft">
                    {preferences.emergencyContact?.name || 'sin contacto configurado'}
                    {preferences.emergencyContact?.phone
                      ? ` · ${preferences.emergencyContact.phone}`
                      : ''}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-1">
                  <dt className="font-semibold text-ink">Ubicación:</dt>
                  <dd className="text-ink-soft">
                    {result.location
                      ? `${result.location.latitude.toFixed(5)}, ${result.location.longitude.toFixed(5)}`
                      : result.locationError || 'no compartida'}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-1">
                  <dt className="font-semibold text-ink">Hora:</dt>
                  <dd className="text-ink-soft">
                    {new Date(result.attemptedAt).toLocaleString('es')}
                  </dd>
                </div>
              </dl>

              <pre className="mt-4 overflow-x-auto rounded-md bg-white/80 p-3 text-xs whitespace-pre-wrap text-ink">
                {result.message}
              </pre>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" icon={Copy} onClick={() => copy(result.message)}>
                  {copied ? 'Copiado' : 'Copiar mensaje'}
                </Button>
                {preferences.emergencyContact?.phone && (
                  <Button
                    as="a"
                    href={`tel:${preferences.emergencyContact.phone}`}
                    size="sm"
                    variant="secondary"
                    icon={Phone}
                  >
                    Llamar a {preferences.emergencyContact.name || 'contacto'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setResult(null)}>
                  Cerrar
                </Button>
              </div>

              {copyError && (
                <p className="mt-2 text-sm text-danger" role="alert">
                  {copyError}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Contacto de emergencia */}
        <Card padding="lg">
          <h2 className="font-display text-lg font-extrabold text-brand-800">Contacto de emergencia</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Se guarda solo en este dispositivo y se incluye en el mensaje preparado.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="contacto-nombre" className="text-sm font-semibold text-ink">
                Nombre
              </label>
              <input
                id="contacto-nombre"
                type="text"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="María"
                className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 text-ink placeholder:text-ink-soft/70"
              />
            </div>
            <div>
              <label htmlFor="contacto-telefono" className="text-sm font-semibold text-ink">
                Teléfono
              </label>
              <input
                id="contacto-telefono"
                type="tel"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="+51 999 999 999"
                className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 text-ink placeholder:text-ink-soft/70"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button size="sm" icon={Save} onClick={saveContact}>
              Guardar contacto
            </Button>
            <p aria-live="polite" className="text-sm font-semibold text-success">
              {contactSaved ? 'Contacto guardado.' : ''}
            </p>
          </div>
        </Card>

        {/* Gesto de emergencia */}
        <Card padding="lg">
          <h2 className="font-display text-lg font-extrabold text-brand-800">Gesto de emergencia</h2>
          <p className="mt-1 text-sm text-ink-soft">
            El gesto que activará la confirmación del SOS. Se detectará con los guantes cuando el
            firmware esté conectado.
          </p>

          <label htmlFor="gesto-emergencia" className="mt-4 block text-sm font-semibold text-ink">
            Gesto elegido
          </label>
          <select
            id="gesto-emergencia"
            value={preferences.emergencyGesture}
            onChange={(event) => updatePreference('emergencyGesture', event.target.value)}
            className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 text-ink"
          >
            {EMERGENCY_GESTURES.map((gesture) => (
              <option key={gesture.value} value={gesture.value}>
                {gesture.label}
              </option>
            ))}
          </select>

          <p className="mt-3 rounded-md bg-brand-50 p-3 text-xs text-ink-soft">
            Hoy el gesto no se detecta realmente: los guantes todavía no envían datos por Bluetooth.
            El botón SOS sí funciona como confirmación manual.
          </p>
        </Card>

        {/* Alerta por Telegram */}
        <Card padding="lg" className="lg:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800">
            <MessageCircle className="size-5 text-brand-600" aria-hidden="true" />
            Alerta por Telegram
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            El mensaje de emergencia se envía desde tu propio bot de Telegram. Se configura una vez y
            queda guardado solo en este navegador.
          </p>

          <ol className="mt-3 grid gap-1.5 rounded-md bg-brand-50 px-3 py-2.5 text-xs text-ink-soft">
            <li>
              <span className="font-semibold text-brand-800">1.</span> Abre Telegram, busca{' '}
              <strong className="text-ink">@BotFather</strong> y envía <code>/newbot</code>. Copia el
              token que te da.
            </li>
            <li>
              <span className="font-semibold text-brand-800">2.</span> Tu contacto debe abrir ese bot
              y enviarle <code>/start</code> una vez (Telegram no permite escribir a un número sin
              eso).
            </li>
            <li>
              <span className="font-semibold text-brand-800">3.</span> Pega el token, pulsa{' '}
              <strong className="text-ink">Buscar contactos</strong> y elige a quién avisar.
            </li>
            <li>
              <span className="font-semibold text-brand-800">4.</span> Con el guante conectado, en{' '}
              <strong className="text-ink">Traducción</strong> agita el guante{' '}
              <strong className="text-ink">3 veces</strong>: la alerta se envía sin entrenar señas.
            </li>
          </ol>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="telegram-token" className="text-sm font-semibold text-ink">
                Token del bot
              </label>
              <input
                id="telegram-token"
                type="password"
                autoComplete="off"
                spellCheck="false"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="123456789:AA…"
                className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 font-mono text-sm text-ink placeholder:text-ink-soft/70"
              />
            </div>
            <div>
              <label htmlFor="telegram-chat" className="text-sm font-semibold text-ink">
                Contacto (ID del chat)
              </label>
              <input
                id="telegram-chat"
                type="text"
                inputMode="numeric"
                spellCheck="false"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="123456789"
                className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 font-mono text-sm text-ink placeholder:text-ink-soft/70"
              />
            </div>
          </div>

          {chats.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-ink">Chats que escribieron al bot</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setChatInput(chat.id)
                        setTelegramError('')
                      }}
                      className={
                        chatInput === chat.id
                          ? 'min-h-10 rounded-full bg-brand-600 px-3 text-sm font-semibold text-white'
                          : 'min-h-10 rounded-full bg-brand-50 px-3 text-sm font-semibold text-brand-700 hover:bg-lavender'
                      }
                    >
                      {chat.name}
                      {chat.username ? ` ${chat.username}` : ''} · {chat.id}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" icon={Search} onClick={searchChats} disabled={searching}>
              {searching ? 'Buscando…' : 'Buscar contactos'}
            </Button>
            <Button size="sm" icon={Save} onClick={saveTelegram}>
              Guardar Telegram
            </Button>
            <Button size="sm" variant="secondary" icon={Send} onClick={testTelegram} disabled={testingSend}>
              {testingSend ? 'Enviando…' : 'Enviar prueba'}
            </Button>
            {telegram.token && (
              <Button size="sm" variant="ghost" icon={Trash2} onClick={removeTelegram}>
                Quitar
              </Button>
            )}
          </div>

          <p aria-live="polite" className="mt-3 text-sm font-semibold text-success">
            {telegramMessage}
          </p>

          {telegramError && (
            <p role="alert" className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {telegramError}
            </p>
          )}

          <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs text-ink-soft">
            <strong className="text-ink">Seguridad:</strong> el token se guarda en este navegador y
            cualquiera con acceso a este equipo podría leerlo. Crea un bot solo para KLAPS y no lo
            compartas. La alerta se marca como enviada únicamente cuando Telegram responde
            correctamente.
          </p>
        </Card>

        {/* Ubicación */}
        <Card padding="lg" className="lg:col-span-2">
          <h2 className="font-display text-lg font-extrabold text-brand-800">Ubicación</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Solo se solicita cuando tú lo pides. Nunca se comparte en segundo plano.
          </p>

          <div className="mt-4">
            <Toggle
              label="Compartir mi ubicación al pedir ayuda"
              description="Se incluirá en el mensaje de la alerta mientras esté activado."
              checked={Boolean(preferences.shareLocation)}
              onChange={(checked) => updatePreference('shareLocation', checked)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" icon={MapPin} onClick={testLocation} disabled={locating}>
              {locating ? 'Buscando…' : 'Probar mi ubicación'}
            </Button>
            {location && (
              <p className="text-sm text-ink">
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · precisión ±
                {Math.round(location.accuracy)} m{' '}
                <a
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-700 underline underline-offset-2"
                >
                  Ver en el mapa
                </a>
              </p>
            )}
          </div>

          {locationError && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {locationError}
            </p>
          )}
        </Card>
      </div>

      {/* Confirmación en dos pasos */}
      <Modal
        open={phase !== 'idle'}
        onClose={cancelFlow}
        title={phase === 'sending' ? 'Preparando la alerta' : '¿Activar la emergencia?'}
        description={
          phase === 'confirm'
            ? 'Se preparará un mensaje de ayuda con tu contacto y tu ubicación (si lo autorizas).'
            : undefined
        }
        footer={
          phase === 'sending' ? null : (
            <>
              <Button variant="secondary" onClick={cancelFlow} className="sm:mr-auto">
                Cancelar
              </Button>
              {phase === 'confirm' ? (
                <Button
                  variant="danger"
                  onClick={() => {
                    setCountdown(COUNTDOWN_START)
                    setPhase('countdown')
                  }}
                >
                  Sí, continuar
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => {
                    setCountdown(0)
                    runAlert()
                  }}
                >
                  Preparar ahora
                </Button>
              )}
            </>
          )
        }
      >
        {phase === 'confirm' && (
          <ul className="space-y-2 text-sm text-ink">
            <li>· Se incluirá tu nombre y el mensaje «Necesito ayuda inmediata».</li>
            <li>
              · El destino será{' '}
              <strong>
                {preferences.emergencyContact?.name || 'tu contacto de emergencia'}
              </strong>
              .
            </li>
            <li>
              · La ubicación{' '}
              {preferences.shareLocation ? 'se incluirá' : 'no se incluirá'}; puedes cambiarlo en esta
              misma pantalla.
            </li>
            <li>
              · El envío {channelReady ? 'se hará por Telegram' : 'no saldrá de este dispositivo'}:{' '}
              {channelReady
                ? `llegará a ${telegram.chatName || telegram.chatId}.`
                : 'falta configurar el canal en esta pantalla.'}
            </li>
          </ul>
        )}

        {phase === 'countdown' && (
          <div className="text-center">
            <p
              aria-live="assertive"
              className="font-display text-6xl font-extrabold text-danger"
            >
              {countdown}
            </p>
            <p className="mt-2 text-sm text-ink">
              La alerta se preparará automáticamente al terminar la cuenta atrás.
            </p>
          </div>
        )}

        {phase === 'sending' && (
          <p className="text-center text-sm text-ink" role="status">
            Preparando el mensaje de ayuda…
          </p>
        )}
      </Modal>
    </div>
  )
}
