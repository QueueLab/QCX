import os
import urllib.request
import json

def main():
    # Attempt to infer PR number from the environment or a known constant
    # Given the branch name 'feat/mentions-feature-5204406483989686825', it's likely a recent PR.
    # The user mentioned "There are comments on the Pull Request".
    # I'll try to find the PR for this branch first.

    repo = "QueueLab/QCX"
    branch = "feat/mentions-feature-5204406483989686825"
    token = os.environ.get("GITHUB_TOKEN")

    if not token:
        print("GITHUB_TOKEN not found")
        return

    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}

    # 1. Find PR for branch
    pr_url = f"https://api.github.com/repos/{repo}/pulls?head=QueueLab:{branch}&state=open"
    req = urllib.request.Request(pr_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            prs = json.loads(response.read().decode())
            if not prs:
                print(f"No open PR found for branch {branch}")
                return
            pr_number = prs[0]['number']
            print(f"Found PR #{pr_number}")
    except Exception as e:
        print(f"Error finding PR: {e}")
        return

    # 2. Get review comments
    comments_url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/comments"
    req = urllib.request.Request(comments_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            comments = json.loads(response.read().decode())
            print(f"\n--- Review Comments for PR #{pr_number} ---")
            for comment in comments:
                print(f"File: {comment['path']}")
                print(f"Author: {comment['user']['login']}")
                print(f"Comment: {comment['body']}")
                print("-" * 20)
    except Exception as e:
        print(f"Error fetching comments: {e}")

    # 3. Get issue comments (PR conversation)
    issue_comments_url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    req = urllib.request.Request(issue_comments_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            comments = json.loads(response.read().decode())
            print(f"\n--- Conversation Comments for PR #{pr_number} ---")
            for comment in comments:
                print(f"Author: {comment['user']['login']}")
                print(f"Comment: {comment['body']}")
                print("-" * 20)
    except Exception as e:
        print(f"Error fetching issue comments: {e}")

if __name__ == "__main__":
    main()
