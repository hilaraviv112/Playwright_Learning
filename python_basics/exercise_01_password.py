# תרגיל 1 - בדיקת סיסמה (הפתרון של הילה)
# הרצה: python3 python_basics/exercise_01_password.py

def is_valid_password(password):
    if len(password) > 8:
        return True
    else:
        return False


assert is_valid_password("abcdefghijk") == True    # 11 תווים - תקינה
assert is_valid_password("abc") == False           # 3 תווים - קצרה מדי
print("כל הבדיקות עברו ✅")
