def classify(level: float) -> str:
    """Classify a groundwater level into a risk category.

    Args:
        level: Groundwater level in metres.

    Returns:
        "Safe" if level > 10, "Warning" if 5 <= level <= 10, "Critical" if level < 5.
    """
    if level > 10:
        return "Safe"
    elif level >= 5:
        return "Warning"
    else:
        return "Critical"
