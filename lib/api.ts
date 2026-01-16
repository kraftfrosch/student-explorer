import type {
  SetType,
  StudentListResponse,
  SubjectListResponse,
  TopicListResponse,
  StartConversationRequest,
  StartConversationResponse,
  InteractRequest,
  InteractResponse,
  LeaderboardResponse,
  CombinedLeaderboardResponse,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://knowunity-agent-olympics-2026-api.vercel.app'

// Server-side only - API key should not be exposed to client
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const apiKey = process.env.STUDENT_API_KEY
  if (!apiKey) {
    throw new Error('STUDENT_API_KEY environment variable is not set')
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Public endpoints (no auth required)
async function fetchPublic(endpoint: string) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 }, // Cache for 60 seconds
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Catalog endpoints (public)
export async function listStudents(setType?: SetType): Promise<StudentListResponse> {
  const params = setType ? `?set_type=${setType}` : ''
  return fetchPublic(`/students${params}`)
}

export async function getStudentTopics(studentId: string): Promise<TopicListResponse> {
  return fetchPublic(`/students/${studentId}/topics`)
}

export async function listSubjects(): Promise<SubjectListResponse> {
  return fetchPublic('/subjects')
}

export async function listTopics(subjectId?: string): Promise<TopicListResponse> {
  const params = subjectId ? `?subject_id=${subjectId}` : ''
  return fetchPublic(`/topics${params}`)
}

// Interaction endpoints (require auth - server-side only)
export async function startConversation(request: StartConversationRequest): Promise<StartConversationResponse> {
  return fetchWithAuth('/interact/start', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function sendMessage(request: InteractRequest): Promise<InteractResponse> {
  return fetchWithAuth('/interact', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// Health check
export async function healthCheck() {
  return fetchPublic('/health')
}

// Leaderboard endpoints (public)
export async function getInferenceLeaderboard(setType?: SetType): Promise<LeaderboardResponse> {
  const params = setType ? `?set_type=${setType}` : ''
  return fetchPublic(`/evaluate/leaderboard/inference${params}`)
}

export async function getTutoringLeaderboard(setType?: SetType): Promise<LeaderboardResponse> {
  const params = setType ? `?set_type=${setType}` : ''
  return fetchPublic(`/evaluate/leaderboard/tutoring${params}`)
}

export async function getCombinedLeaderboard(setType?: SetType): Promise<CombinedLeaderboardResponse> {
  const params = setType ? `?set_type=${setType}` : ''
  return fetchPublic(`/evaluate/leaderboard/combined${params}`)
}
