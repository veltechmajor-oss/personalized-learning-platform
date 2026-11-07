import logging
import os
import cloudinary
import cloudinary.uploader
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Cloudinary from configuration settings
cloud_name = getattr(settings, "CLOUDINARY_CLOUD_NAME", None) or os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = getattr(settings, "CLOUDINARY_API_KEY", None) or os.getenv("CLOUDINARY_API_KEY")
api_secret = getattr(settings, "CLOUDINARY_API_SECRET", None) or os.getenv("CLOUDINARY_API_SECRET")
cloudinary_url = getattr(settings, "CLOUDINARY_URL", None) or os.getenv("CLOUDINARY_URL")

if cloudinary_url:
    try:
        cloudinary.config(cloudinary_url=cloudinary_url)
        logger.info("Configured Cloudinary from CLOUDINARY_URL.")
    except Exception as e:
        logger.warning(f"Could not configure Cloudinary from URL: {e}")

if cloud_name and api_key and api_secret:
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    logger.info("Configured Cloudinary with cloud_name: %s", cloud_name)
else:
    logger.warning("Cloudinary credentials not fully supplied in settings or environment.")


def upload_file(file_path: str, public_id: str, resource_type: str = "raw") -> dict:
    """Upload a local file to Cloudinary.

    Returns a dict containing at least ``secure_url`` and ``public_id``.
    Raises ``RuntimeError`` on failure with the exact underlying error message.
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at {file_path}")

        # Cloudinary upload
        result = cloudinary.uploader.upload(
            file_path,
            public_id=public_id,
            resource_type=resource_type,
            folder="academic_iq/documents",
            overwrite=True,
        )
        logger.info("Uploaded %s to Cloudinary (public_id=%s, url=%s)", file_path, result.get("public_id"), result.get("secure_url"))
        return result
    except Exception as e:
        logger.error("Cloudinary upload failed for %s: %s", file_path, e)
        raise RuntimeError(f"Cloudinary upload failed: {str(e)}")
