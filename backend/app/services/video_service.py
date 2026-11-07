"""
YouTube URL validation and video metadata extraction.
"""
import re
from typing import Optional, Tuple


class VideoService:
    @staticmethod
    def extract_youtube_id(url: str) -> Optional[str]:
        """Extract 11-character YouTube video ID from various URL formats."""
        if not url:
            return None

        clean_url = url.strip()

        # Direct 11-character video ID
        if re.match(r"^[a-zA-Z0-9_-]{11}$", clean_url):
            return clean_url

        patterns = [
            # Standard watch URL with arbitrary query parameters (e.g. ?v=... or ?feature=share&v=...)
            r"(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/watch\?(?:[^&]+&)*v=([a-zA-Z0-9_-]{11})",
            # Shortened youtu.be URL (e.g. https://youtu.be/ID?t=10s)
            r"(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})",
            # Embedded or v URL (e.g. /embed/ID or /v/ID)
            r"(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube(?:-nocookie)?\.com\/(?:embed|v)\/([a-zA-Z0-9_-]{11})",
            # Shorts URL (e.g. https://www.youtube.com/shorts/ID)
            r"(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})",
            # Generic fallback searching for 11-character token following v=
            r"v=([a-zA-Z0-9_-]{11})",
        ]

        for p in patterns:
            match = re.search(p, clean_url)
            if match:
                return match.group(1)

        return None

    @classmethod
    def validate_youtube_url(cls, url: str) -> Tuple[bool, str, Optional[str]]:
        video_id = cls.extract_youtube_id(url)
        if not video_id:
            return False, "Invalid YouTube URL or video ID format.", None
        return True, "", video_id


video_service = VideoService()
