export interface Dataset {
  id: string
  name: string
}

export interface Example {
  word: string
  definition: string
}

export interface VerificationResult {
  word: string
  claim: string
  predicted: string
  in_wiki: string
  selected_evidences?: Array<{
    title: string
    text: string
    line_idx: number
    in_intro: boolean
  }>
}

export interface VerificationRequest {
  word: string
  claim: string
}

export interface ProgressMessage {
  type: 'progress'
  message: string
}

export interface ResultMessage {
  type: 'result'
  data: VerificationResult
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type WebSocketMessage = ProgressMessage | ResultMessage | ErrorMessage