export interface VideoMetadata {
  fileName: string
  creator: string
  songName: string
  artist: string
  webAddress: string
  weightScore: number
  mainGirl: string[] | string
  delete: string
  edit: string
  updateForm: string
  updateFormGirls?: string
  updateFormThemes?: string
  theme: string[] | string
}

export interface SongMetadata {
  fileName: string
  artist: string
  songName: string
  weightScore: number
}

export interface VideosData {
  videos: VideoMetadata[]
}

export interface SongsData {
  songs: SongMetadata[]
}
