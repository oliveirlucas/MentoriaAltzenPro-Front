import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  gitHubAvatarUrlFromProfileField,
  initialProfileAvatarStage,
  linkedInAvatarUrlFromProfileField,
  profileAvatarTitleForStage,
  profileAvatarUrlForStage,
  type ProfileAvatarStage,
} from '@/shared/lib/profileAvatar'

export function useProfileAvatarFallback(
  linkedin: string | null | undefined,
  github: string | null | undefined
) {
  const linkedInUrl = useMemo(() => linkedInAvatarUrlFromProfileField(linkedin), [linkedin])
  const githubUrl = useMemo(() => gitHubAvatarUrlFromProfileField(github), [github])
  const profileKey = `${linkedin ?? ''}\u0000${github ?? ''}`

  const [stage, setStage] = useState<ProfileAvatarStage>(() =>
    initialProfileAvatarStage(linkedin, github)
  )

  useEffect(() => {
    setStage(initialProfileAvatarStage(linkedin, github))
  }, [profileKey, linkedin, github])

  const imageUrl = profileAvatarUrlForStage(stage, linkedin, github)
  const showDefault = stage === 'default' || !imageUrl

  const onImageError = useCallback(() => {
    setStage((current) => {
      if (current === 'linkedin' && githubUrl) return 'github'
      return 'default'
    })
  }, [githubUrl])

  return {
    imageUrl: showDefault ? null : imageUrl,
    showDefault,
    onImageError,
    title: profileAvatarTitleForStage(stage),
    stage,
  }
}
