def generate(predictions: list[dict], crop_type: str) -> list[str]:
    """Generate water-conservation recommendations based on predicted risk levels.

    Args:
        predictions: List of prediction dicts, each with a "risk_level" key
                     ("Safe", "Warning", or "Critical").
        crop_type: The primary crop type for the village.

    Returns:
        Deduplicated list of recommendation strings.
    """
    suggestions = []

    risk_levels = [p["risk_level"] for p in predictions]
    has_critical = "Critical" in risk_levels
    has_warning_or_critical = has_critical or "Warning" in risk_levels
    all_safe = all(r == "Safe" for r in risk_levels)

    if has_critical:
        suggestions.append("Reduce irrigation immediately")

    if has_critical and crop_type in ("rice", "sugarcane"):
        suggestions.append("Switch to drought-resistant crops")

    if has_warning_or_critical:
        suggestions.append("Use drip irrigation to conserve water")

    if all_safe:
        suggestions.append("Water levels are stable — continue current practices")

    # Deduplicate while preserving order
    seen = set()
    result = []
    for s in suggestions:
        if s not in seen:
            seen.add(s)
            result.append(s)

    return result
