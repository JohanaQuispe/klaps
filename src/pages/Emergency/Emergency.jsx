import { useCallback, useEffect, useState } from 'react'
import {
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Trash2,
} from 'lucide-react'
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
  clearLink,
  ensureLink,
  isLinked,
  linkContact,
  rotateLink,
} from '../../services/emergency/linkCode.js'
import {
  buildTestMessage,
  sendAlertToContact,
  unlinkContact,
  verifyLinkage,
} from '../../services/emergency/telegramApi.js'
import {
  TELEGRAM_API_URL,
  TELEGRAM_BOT_LABEL,
  buildTelegramDeepLink,
  isTelegramServerConfigured,
  telegramEndpointIssue,
} from '../../config/telegram.js'
import {
  clearSavedLocation,
  describeLocationAge,
  isFreshLocation,
  loadSavedLocation,
  saveSavedLocation,
} from '../../services/emergency/location.js'

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

  // ── Telegram (bot oficial + código de vinculación) ──
  // `ensureLink` crea el código la primera vez y lo guarda en este navegador.
  const [link, setLink] = useState(ensureLink)
  const [telegramMessage, setTelegramMessage] = useState('')
  const [telegramError, setTelegramError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [testingSend, setTestingSend] = useState(false)

  // ── Ubicación guardada para la alerta ──
  const [savedLocation, setSavedLocation] = useState(loadSavedLocation)

  const channelReady = isEmergencyChannelReady(link)
  const deepLink = buildTelegramDeepLink(link.code)
  const linked = isLinked(link)

  const gestureLabel =
    EMERGENCY_GESTURES.find((item) => item.value === preferences.emergencyGesture)?.label ?? ''

  const runAlert = useCallback(async () => {
    setPhase('sending')

    let currentLocation = location
    let locationMessage = locationError
    let locationNote = ''

    if (preferences.shareLocation && !currentLocation) {
      const response = await requestLocation()
      if (response.location) {
        currentLocation = response.location
        saveSavedLocation(response.location)
        setLocation(response.location)
        setSavedLocation(response.location)
        locationMessage = ''
      } else {
        // Respaldo: la ubicación que se autorizó y guardó en esta pantalla.
        const stored = loadSavedLocation()
        if (isFreshLocation(stored)) {
          currentLocation = stored
          locationNote = `ubicación guardada ${describeLocationAge(stored)}`
          setLocation(stored)
        }
        locationMessage = response.error
        setLocationError(response.error)
      }
    }

    const message = buildAlertMessage({
      contactName: preferences.emergencyContact?.name || link.chatName,
      location: currentLocation,
      locationNote,
      gesture: preferences.emergencyGesture === 'sin-gesto' ? null : gestureLabel,
    })

    const response = await sendAlert({
      message,
      contact: preferences.emergencyContact,
      link,
    })

    setResult({ ...response, message, location: currentLocation, locationError: locationMessage })
    setPhase('idle')
  }, [location, locationError, preferences, gestureLabel, link])

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

  const copyInvite = () => {
    if (!deepLink) return
    copy(
      [
        'Ayúdame a recibir mis alertas de KLAPS.',
        `1. Abre este enlace: ${deepLink}`,
        '2. Pulsa «Iniciar» en el bot.',
        `3. Avísame cuando lo hayas hecho (mi código es ${link.code}).`,
      ].join('\n'),
    )
  }

  const verifyLink = async () => {
    setVerifying(true)
    setTelegramError('')
    setTelegramMessage('Consultando la vinculación de tu código…')

    const response = await verifyLinkage(link.code)
    setVerifying(false)

    if (!response.ok) {
      setTelegramMessage('')
      setTelegramError(response.error)
      return
    }

    if (!response.linked) {
      setTelegramMessage('')
      setTelegramError(response.error)
      return
    }

    // Solo se guarda el contacto que el servidor confirmó para ESTE código.
    const next = linkContact(link.code, {
      chatId: response.chatId,
      chatName: response.chatName,
    })
    setLink(next)
    updatePreference('emergencyContact', {
      name: preferences.emergencyContact?.name || response.chatName,
      phone: preferences.emergencyContact?.phone ?? '',
    })
    setTelegramError('')
    setTelegramMessage(
      `Vinculado: las alertas de este navegador llegarán a ${response.chatName || 'tu contacto'}.`,
    )
  }

  const testTelegram = async () => {
    if (!linked) {
      setTelegramError('Vincula primero a tu contacto: sin vinculación no hay a quién avisar.')
      return
    }

    setTestingSend(true)
    setTelegramError('')
    setTelegramMessage('Enviando mensaje de prueba…')

    const response = await sendAlertToContact({
      code: link.code,
      text: buildTestMessage({ botLabel: TELEGRAM_BOT_LABEL }),
    })
    setTestingSend(false)

    if (response.delivered) {
      setTelegramMessage('Prueba enviada: revisa el chat del contacto en Telegram.')
    } else {
      setTelegramMessage('')
      setTelegramError(response.reason)
    }
  }

  const unlink = async () => {
    setTelegramError('')
    setTelegramMessage('')

    // Primero se pide al servidor que olvide la pareja código → chat.
    const response = await unlinkContact(link.code)
    clearLink()
    setLink(ensureLink())

    setTelegramMessage(
      response.ok
        ? 'Contacto desvinculado. Este navegador ya tiene un código nuevo.'
        : 'El contacto se desvinculó en este navegador. El servidor no confirmó la baja; vuelve a intentarlo con conexión.',
    )
    if (!response.ok && response.error) setTelegramError(response.error)
  }

  const rotateCode = async () => {
    setTelegramError('')
    const previous = link.code
    const next = rotateLink()
    setLink(next)
    if (previous) await unlinkContact(previous)
    setTelegramMessage('Código nuevo generado. El anterior ya no se puede usar.')
  }

  const activateLocation = async () => {
    setLocating(true)
    setLocationError('')
    const response = await requestLocation()

    if (response.location) {
      const stored = saveSavedLocation(response.location)
      setSavedLocation(stored)
      setLocation(response.location)
      updatePreference('shareLocation', true)
      setTelegramMessage('')
    } else {
      setLocationError(response.error)
    }
    setLocating(false)
  }

  const removeLocation = () => {
    clearSavedLocation()
    setSavedLocation(null)
    setLocation(null)
    updatePreference('shareLocation', false)
    setLocationError('')
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
            El gesto elegido se describe en el mensaje. La alerta se dispara de tres formas: con la
            seña física de auxilio (agitar el guante 3 veces en{' '}
            <strong className="text-ink">Traducción</strong>), con el botón <strong className="text-ink">Activar SOS</strong> y
            con una seña entrenada llamada SOS.
          </p>
        </Card>

        {/* Alerta por Telegram · bot oficial con código de vinculación */}
        <Card padding="lg" className="lg:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800">
            <MessageCircle className="size-5 text-brand-600" aria-hidden="true" />
            Alerta por Telegram
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            KLAPS avisa con su bot oficial{' '}
            <strong className="font-semibold text-ink">{TELEGRAM_BOT_LABEL || '@ai_klaps_bot'}</strong>
            . No tienes que crear ningún bot ni pegar contraseñas: vinculas a tu familiar con un
            enlace y su chat queda asociado solo a tu código.
          </p>

          {telegramEndpointIssue && (
            <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <strong className="font-semibold">La URL del servidor tiene un problema.</strong>{' '}
              {telegramEndpointIssue}{' '}
              <span className="block text-xs text-ink-soft">
                Valor leído de <code>VITE_TELEGRAM_API_URL</code>:{' '}
                <code className="break-all">{TELEGRAM_API_URL}</code>
              </span>
            </p>
          )}

          {isTelegramServerConfigured && !telegramEndpointIssue && (
            <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-xs break-all text-ink-soft">
              Servidor de alertas: <code>{TELEGRAM_API_URL}</code>
            </p>
          )}

          {!isTelegramServerConfigured && (
            <p role="alert" className="mt-3 rounded-md bg-warning-soft px-3 py-2.5 text-sm text-ink">
              <strong className="font-semibold">Falta conectar el servidor de alertas.</strong>{' '}
              Copia <code>.env.example</code> como <code>.env</code> y define{' '}
              <code>VITE_TELEGRAM_API_URL</code> con la URL de la función (ver{' '}
              <code>docs/etapa-11-telegram-multiusuario.md</code>). Mientras falte, la vinculación y
              el envío están desactivados y la app lo dice: no se simula nada.
            </p>
          )}

          {/* Código de vinculación */}
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase">
              Tu código de vinculación
            </p>
            <p
              className="mt-1 font-mono text-2xl font-extrabold tracking-wide text-brand-800 sm:text-3xl"
              aria-label={`Código de vinculación ${link.code}`}
            >
              {link.code || '—'}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Es único de este navegador. El servidor solo acepta el mensaje{' '}
              <code>/start {link.code}</code>, así que ningún otro chat puede quedar asociado a tu
              alerta.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {deepLink ? (
                <Button
                  as="a"
                  href={deepLink}
                  target="_blank"
                  rel="noreferrer"
                  size="sm"
                  icon={ExternalLink}
                >
                  Vincular contacto en Telegram
                </Button>
              ) : (
                <Button size="sm" icon={ExternalLink} disabled>
                  Vincular contacto en Telegram
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                icon={Copy}
                onClick={copyInvite}
                disabled={!deepLink}
              >
                {copied ? 'Enlace copiado' : 'Copiar enlace para mi familiar'}
              </Button>
              <Button size="sm" variant="ghost" icon={RefreshCw} onClick={rotateCode}>
                Generar otro código
              </Button>
            </div>
            {copyError && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {copyError}
              </p>
            )}
          </div>

          {/* Estado de la vinculación */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={
                linked
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 font-semibold text-brand-800'
                  : 'inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 font-semibold text-brand-700'
              }
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              {linked
                ? `Vinculado a ${link.chatName || 'tu contacto'}`
                : 'Sin vincular: falta que tu familiar abra el enlace'}
            </span>
            {linked && link.linkedAt > 0 && (
              <span className="text-xs text-ink-soft">
                {`Vinculado ${describeLocationAge({ at: link.linkedAt })}`}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={ShieldCheck}
              onClick={verifyLink}
              disabled={verifying || !isTelegramServerConfigured}
            >
              {verifying ? 'Verificando…' : 'Verificar vinculación'}
            </Button>
            <Button
              size="sm"
              icon={Send}
              onClick={testTelegram}
              disabled={testingSend || !linked}
            >
              {testingSend ? 'Enviando…' : 'Enviar prueba'}
            </Button>
            {linked && (
              <Button size="sm" variant="ghost" icon={Trash2} onClick={unlink}>
                Desvincular
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
            <strong className="text-ink">Cómo funciona:</strong> el código viaja dentro del enlace
            <code className="mx-1">t.me/{'{bot}'}?start={link.code || 'KLAPS-00000'}</code>
            Cuando tu familiar pulsa <strong className="text-ink">Iniciar</strong>, el servidor de
            KLAPS guarda su <code>chat_id</code> junto a ese código y descarta los demás chats. El
            token del bot nunca llega al navegador.
          </p>
        </Card>

        {/* Ubicación autorizada por adelantado */}
        <Card padding="lg" className="lg:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800">
            <MapPin className="size-5 text-brand-600" aria-hidden="true" />
            Ubicación para emergencias
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Autoriza la ubicación ahora, con calma. Cuando la alerta salga sola desde el guante, el
            mensaje llevará las últimas coordenadas guardadas aunque el navegador no pueda pedirlas
            en ese momento.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Button
                variant="secondary"
                icon={MapPin}
                onClick={activateLocation}
                disabled={locating}
                fullWidth
              >
                {locating
                  ? 'Obteniendo ubicación…'
                  : savedLocation
                    ? 'Actualizar ubicación'
                    : 'Activar ubicación para emergencias'}
              </Button>
              <p className="mt-2 text-xs text-ink-soft">
                El navegador pedirá permiso una vez. Si lo niegas, KLAPS lo dice y no inventa
                coordenadas.
              </p>
            </div>

            <div className="rounded-md bg-brand-50 px-3 py-2.5">
              {savedLocation ? (
                <>
                  <p className="text-sm font-semibold text-ink">
                    {isFreshLocation(savedLocation) ? 'Ubicación lista' : 'Ubicación vencida'}
                    <span className="font-normal text-ink-soft">
                      {' '}
                      · {describeLocationAge(savedLocation)}
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-ink-soft">
                    {savedLocation.latitude.toFixed(5)}, {savedLocation.longitude.toFixed(5)}
                    {Number.isFinite(Number(savedLocation.accuracy))
                      ? ` ±${Math.round(savedLocation.accuracy)} m`
                      : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <a
                      href={`https://www.google.com/maps?q=${savedLocation.latitude},${savedLocation.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-700 underline underline-offset-2"
                    >
                      Ver en el mapa
                    </a>
                    <button
                      type="button"
                      onClick={removeLocation}
                      className="font-semibold text-ink-soft underline underline-offset-2 hover:text-danger"
                    >
                      Borrar ubicación
                    </button>
                  </div>
                  {!isFreshLocation(savedLocation) && (
                    <p className="mt-1 text-xs text-warning">
                      Tiene más de 6 horas: actualízala para que la alerta la use sola.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-soft">
                  Todavía no hay ninguna ubicación guardada en este navegador.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <Toggle
              label="Incluir mi ubicación en la alerta"
              description="Se añade al mensaje de emergencia. Nunca se comparte en segundo plano."
              checked={Boolean(preferences.shareLocation)}
              onChange={(checked) => updatePreference('shareLocation', checked)}
            />
          </div>

          {locationError && (
            <p role="alert" className="mt-3 text-sm text-danger">
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
