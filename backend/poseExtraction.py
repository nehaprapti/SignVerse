import cv2
import mediapipe as mp
import os
import json


# Output dir for pose_json (not used later, but keep for debug)
pose_json_dir = r"E:\SignVerse\backend\pose_json"
print("Output dir:", pose_json_dir)
os.makedirs(pose_json_dir, exist_ok=True)

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, model_complexity=1)
mp_drawing = mp.solutions.drawing_utils

# Input video folder
base_dir = r"E:\SignVerse\backend\dataset"

# Output folder for JSON keypoints
output_dir = r"E:\SignVerse\backend\keypoints"
os.makedirs(output_dir, exist_ok=True)

# Loop through each word folder


# Delete all .json files and subfolders in keypoints before processing
for item in os.listdir(output_dir):
    item_path = os.path.join(output_dir, item)
    if os.path.isdir(item_path):
        # Remove subfolder and its contents
        for f in os.listdir(item_path):
            try:
                os.remove(os.path.join(item_path, f))
            except Exception as e:
                print(f"Error deleting {f} in {item}: {e}")
        try:
            os.rmdir(item_path)
        except Exception as e:
            print(f"Error removing folder {item}: {e}")
    elif item.endswith('.json'):
        try:
            os.remove(item_path)
        except Exception as e:
            print(f"Error deleting {item}: {e}")

# Now process each word folder and save output as keypoints/{word}.json
for word in os.listdir(base_dir):
    word_path = os.path.join(base_dir, word)
    if not os.path.isdir(word_path):
        continue

    all_videos_keypoints = []

    for video_file in os.listdir(word_path):
        if not video_file.endswith((".mp4", ".avi", ".mov")):
            continue

        video_path = os.path.join(word_path, video_file)
        cap = cv2.VideoCapture(video_path)
        video_keypoints = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(frame_rgb)

            if results.pose_landmarks:
                frame_keypoints = []
                for lm in results.pose_landmarks.landmark:
                    frame_keypoints.append({
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z,
                        "visibility": lm.visibility
                    })
                video_keypoints.append(frame_keypoints)

        cap.release()
        all_videos_keypoints.append({
            "video": video_file,
            "keypoints": video_keypoints
        })

    # Save all keypoints for this word folder into one JSON file in keypoints
    json_path = os.path.join(output_dir, f"{word}.json")
    with open(json_path, 'w') as f:
        json.dump(all_videos_keypoints, f, indent=4)
    print(f"Saved keypoints for word '{word}' → {json_path}")

print("✅ All folders processed successfully!")