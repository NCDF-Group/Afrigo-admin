'use client'
import { useCallback, useState } from 'react'
import { api } from '@/lib/client/api'
import { Button } from './button'
import { Dialog } from './sheet'
import { Field, Input, Textarea } from './field'
import { useToast } from './toast'

export function useMutation() {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const run = useCallback(
    async <T = any,>(key: string, path: string, init: { method?: string; json: unknown }, success?: string) => {
      setBusy(key)
      try {
        const result = await api<T>(path, { method: init.method ?? 'POST', json: init.json })
        if (success) toast(success)
        return result
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Something went wrong', 'error')
        return null
      } finally {
        setBusy(null)
      }
    },
    [toast]
  )
  return { run, busy }
}

export type ConfirmRequest = {
  title: string
  description?: string
  confirmLabel: string
  tone?: 'primary' | 'danger' | 'success'
  reason?: 'required' | 'optional'
  reasonLabel?: string
  input?: { label: string; placeholder?: string }
  onConfirm: (value: { reason: string; input: string }) => Promise<unknown>
}

export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [reason, setReason] = useState('')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const ask = useCallback((next: ConfirmRequest) => {
    setReason('')
    setInput('')
    setRequest(next)
  }, [])

  const close = () => !busy && setRequest(null)
  const blocked = (request?.reason === 'required' && !reason.trim()) || (request?.input && !input.trim())

  const dialog = (
    <Dialog
      open={Boolean(request)}
      onClose={close}
      title={request?.title}
      description={request?.description}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={request?.tone ?? 'primary'}
            loading={busy}
            disabled={Boolean(blocked)}
            onClick={async () => {
              if (!request) return
              setBusy(true)
              const result = await request.onConfirm({ reason: reason.trim(), input: input.trim() })
              setBusy(false)
              if (result !== null) setRequest(null)
            }}
          >
            {request?.confirmLabel}
          </Button>
        </>
      }
    >
      {request?.input || request?.reason ? (
        <div className="space-y-4">
          {request.input ? (
            <Field label={request.input.label}>
              <Input autoFocus value={input} placeholder={request.input.placeholder} onChange={event => setInput(event.target.value)} />
            </Field>
          ) : null}
          {request.reason ? (
            <Field label={request.reasonLabel ?? (request.reason === 'required' ? 'Reason' : 'Note (optional)')}>
              <Textarea autoFocus={!request.input} value={reason} onChange={event => setReason(event.target.value)} placeholder="This is saved to the audit log" />
            </Field>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  )

  return { ask, dialog }
}
