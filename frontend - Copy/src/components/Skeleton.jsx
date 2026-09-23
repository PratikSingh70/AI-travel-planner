/**
 * Reusable skeleton placeholder.
 *
 * Usage:
 *   <Skeleton variant="text" width="60%" />
 *   <Skeleton variant="circular" width={40} height={40} />
 *   <Skeleton variant="rectangular" width="100%" height={200} />
 *   <Skeleton variant="card" />           // image + title + lines
 */
const Skeleton = ({
  variant = "rectangular",
  width,
  height,
  className = "",
  style = {},
  count = 1,
  rounded,
}) => {
  const baseClass = "skeleton";
  const variantClass = {
    text: "skeleton-text",
    circular: "skeleton-circle",
    rectangular: "skeleton-img",
    card: "",
  }[variant] || "";

  const autoRounded =
    rounded !== undefined
      ? rounded
      : variant === "text"
      ? "6px"
      : variant === "circular"
      ? "50%"
      : "12px";

  const inlineStyle = {
    width,
    height,
    borderRadius: autoRounded,
    ...style,
  };

  // Count = render N stacked skeletons
  if (count > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className={`${baseClass} ${variantClass}`} style={inlineStyle} />
        ))}
      </div>
    );
  }

  // card = composite (image + title + 2 lines)
  if (variant === "card") {
    return (
      <div className={`animate-fade-in ${className}`}>
        <div className={`${baseClass} skeleton-img`} style={{ width: "100%", aspectRatio: "4 / 3" }} />
        <div className={`${baseClass} skeleton-text`} style={{ width: "70%", height: 18, marginTop: 12 }} />
        <div className={`${baseClass} skeleton-text`} style={{ width: "45%", height: 12, marginTop: 8 }} />
      </div>
    );
  }

  return <div className={`${baseClass} ${variantClass} ${className}`} style={inlineStyle} />;
};

export default Skeleton;