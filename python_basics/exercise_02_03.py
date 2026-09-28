# תרגילים 2 ו-3 (הפתרונות של הילה)
# הרצה: python3 python_basics/exercise_02_03.py

# ---------- תרגיל 2: האם המשתמשת בגירה? ----------
def is_adult(age):
    if age >= 18:        # age הוא כבר מספר - לא צריך len
        return True
    else:
        return False


assert is_adult(30) == True
assert is_adult(10) == False
assert is_adult(18) == True     # בדיקת גבול
print("תרגיל 2 עבר ✅")


# ---------- תרגיל 3: האם המשימה ריקה? ----------
def is_empty_task(task):
    if task == '':       # משווים ישירות למחרוזת ריקה
        return True      # (דרך נוספת: len(task) == 0)
    else:
        return False


assert is_empty_task("") == True
assert is_empty_task("לקנות חלב") == False
assert is_empty_task("א") == False       # בדיקת גבול - תו אחד
print("תרגיל 3 עבר ✅")
