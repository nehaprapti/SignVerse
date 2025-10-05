
import json
import os

# Define mapping of MediaPipe indices to your avatar bones
joint_map = {
    0: "nose",
    11: "leftShoulder",
    12: "rightShoulder",
    13: "leftElbow",
    14: "rightElbow",
    15: "leftWrist",
    16: "rightWrist",
    23: "leftHip",
    24: "rightHip"
    # 👉 Add more if needed
}


keypoints_dir = r"E:\SignVerse\backend\keypoints"
animated_dir = r"E:\SignVerse\backend\animations"
output_suffix = "_animation.json"

# Ensure animated folder exists
os.makedirs(animated_dir, exist_ok=True)

for filename in os.listdir(keypoints_dir):
    if not filename.endswith('.json'):
        continue
    input_path = os.path.join(keypoints_dir, filename)
    output_path = os.path.join(animated_dir, filename.replace('.json', output_suffix))

    with open(input_path) as f:
        pose_data = json.load(f)

    # pose_data is a list of videos, each with 'video' and 'keypoints'
    animation_data = []
    for video in pose_data:
        video_name = video.get('video', '')
        for frame_idx, frame in enumerate(video.get('keypoints', [])):
            frame_obj = {"frame": frame_idx, "joints": {}}
            for idx, coords in enumerate(frame):
                if idx in joint_map:
                    frame_obj["joints"][joint_map[idx]] = [coords["x"], coords["y"], coords["z"]]
            frame_obj["video"] = video_name
            animation_data.append(frame_obj)

    with open(output_path, "w") as f:
        json.dump(animation_data, f, indent=4)
    print(f"✅ Converted {filename} → {os.path.basename(output_path)}")