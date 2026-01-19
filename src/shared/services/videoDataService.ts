import type { VideoMetadata } from '../types/media'

export class VideoDataService {
  private videosJsonHandle: any = null
  private directoryHandle: any = null

  async initialize(dirHandle: any) {
    this.directoryHandle = dirHandle
    await this.findOrCreateVideosJson()
  }

  private async findOrCreateVideosJson() {
    try {
      // Check if videos.json exists in the directory
      try {
        this.videosJsonHandle = await this.directoryHandle.getFileHandle('videos.json')
        console.log('Found videos.json')
      } catch {
        // Create it if it doesn't exist
        this.videosJsonHandle = await this.directoryHandle.getFileHandle('videos.json', {
          create: true,
        })

        // Initialize with empty array
        await this.saveVideos([])
        console.log('Created videos.json')
      }
    } catch (error) {
      console.error('Failed to find or create videos.json:', error)
      throw error
    }
  }

  async loadVideos(): Promise<VideoMetadata[]> {
    try {
      if (!this.videosJsonHandle) {
        return []
      }

      const file = await this.videosJsonHandle.getFile()
      const text = await file.text()

      if (!text || text.trim() === '') {
        return []
      }

      const data = JSON.parse(text)
      return data.videos || []
    } catch (error) {
      console.error('Failed to load videos:', error)
      return []
    }
  }

  async saveVideos(videos: VideoMetadata[]): Promise<void> {
    try {
      if (!this.videosJsonHandle) {
        throw new Error('videos.json not initialized')
      }

      const data = { videos }
      const writable = await this.videosJsonHandle.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()

      console.log('Saved videos to videos.json:', data)
    } catch (error) {
      console.error('Failed to save videos:', error)
      throw error
    }
  }

  async addOrUpdateVideo(video: VideoMetadata): Promise<void> {
    const videos = await this.loadVideos()
    const existingIndex = videos.findIndex((v) => v.fileName === video.fileName)

    if (existingIndex >= 0) {
      videos[existingIndex] = video
    } else {
      videos.push(video)
    }

    await this.saveVideos(videos)
  }

  async getVideoByFileName(fileName: string): Promise<VideoMetadata | undefined> {
    const videos = await this.loadVideos()
    return videos.find((v) => v.fileName === fileName)
  }
}

export const videoDataService = new VideoDataService()
