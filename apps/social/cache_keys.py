def room_stats_key(username: str) -> str:
    return f"room:stats:{username}"

def guestbook_list_key(username: str) -> str:
    return f"room:guestbook:list:{username}"

def diary_calendar_key(username: str, year: int, month: int) -> str:
    return f"room:diary:calendar:{username}:{year}:{month}"

def friend_list_key(user_id: int) -> str:
    return f"friends:list:{user_id}"
