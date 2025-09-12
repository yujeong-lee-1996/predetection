import joblib
bundle = joblib.load("bundle.pkl")
pipe = bundle["pipeline"]
cols = bundle["signature"]["columns"]