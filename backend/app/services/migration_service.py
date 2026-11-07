"""
Migration service for Course Folders and Video Lessons.
Ensures legacy videos (such as 'power BI') are mapped to course folders idempotently.
"""
import uuid
import datetime
import logging
from app.core.firebase import firebase_manager

logger = logging.getLogger(__name__)


def run_video_folder_migration():
    """
    Idempotent migration:
    1. Ensures default course folder exists.
    2. Maps unassigned videos to the folder.
    3. Re-synchronizes folder video_count counters.
    """
    try:
        folders = firebase_manager.list_documents("course_folders")
        folder_map = {f.get("folder_name", "").strip().lower(): f for f in folders}

        default_folder_name = "Data Analytics & Business Intelligence"
        folder_key = default_folder_name.lower()

        if folder_key in folder_map:
            default_folder = folder_map[folder_key]
            default_folder_id = default_folder.get("id") or default_folder.get("folder_id")
        else:
            default_folder_id = str(uuid.uuid4())
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            default_folder = {
                "id": default_folder_id,
                "folder_id": default_folder_id,
                "folder_name": default_folder_name,
                "description": "Curriculum modules covering Business Intelligence, Pivot Tables, interactive dashboards, and reporting.",
                "subject": "Computer Science",
                "created_by": "system_migration",
                "created_at": now,
                "updated_at": now,
                "published": True,
                "is_published": True,
                "video_count": 0
            }
            firebase_manager.set_document("course_folders", default_folder_id, default_folder)
            logger.info("Created initial course folder: %s (%s)", default_folder_name, default_folder_id)

        # Inspect all videos
        videos = firebase_manager.list_documents("videos")
        for v in videos:
            vid_id = v.get("id")
            current_folder = v.get("folder_id")
            if not current_folder:
                learning_obj = v.get("learning_objectives") or (
                    "• Master Excel Pivot Table creation and configuration.\n"
                    "• Answer business intelligence questions using data grouping.\n"
                    "• Apply slicers and report filters to interactive dashboards.\n"
                    "• Generate dynamic pivot charts from business datasets."
                )
                update_fields = {
                    "folder_id": default_folder_id,
                    "learning_objectives": learning_obj,
                    "published": v.get("is_published", True),
                    "is_published": v.get("is_published", True),
                    "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }
                firebase_manager.update_document("videos", vid_id, update_fields)
                logger.info("Migrated video '%s' to folder '%s'", v.get("title"), default_folder_name)

        # Recount videos for all folders
        all_videos = firebase_manager.list_documents("videos")
        counts = {}
        for v in all_videos:
            fid = v.get("folder_id")
            if fid:
                counts[fid] = counts.get(fid, 0) + 1

        all_folders = firebase_manager.list_documents("course_folders")
        for f in all_folders:
            fid = f.get("id") or f.get("folder_id")
            cnt = counts.get(fid, 0)
            firebase_manager.update_document("course_folders", fid, {"video_count": cnt})

        logger.info("Video folder migration completed successfully.")
        return True
    except Exception as e:
        logger.error("Error during video folder migration: %s", e)
        return False

