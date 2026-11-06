import { useUiStore } from '../../stores/uiStore';

export function CitationBadge({ order, citation }) {
  const { openCitation } = useUiStore();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCitation(citation);
  };

  return (
    <button
      type="button"
      className="citation-badge"
      onClick={handleClick}
      title={citation?.sourceLocation ? `Citation [${order}]: ${citation.sourceLocation}` : `Citation [${order}]`}
      aria-label={`View citation source ${order}`}
    >
      {order}
    </button>
  );
}
