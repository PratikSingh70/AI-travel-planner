import "./SubmitButton.css";

const SubmitButton = ({
  children = "Generate Trip",
  state = "idle",
  type = "submit",
  onClick,
  disabled = false,
}) => {
  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      className={`sb-btn ${isLoading ? "is-loading" : ""} ${
        isSuccess ? "is-success" : ""
      }`}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading}
    >
      {isSuccess ? (
        <svg
          className="sb-check"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span className="sb-label">{children}</span>
      )}
    </button>
  );
};

export default SubmitButton;