import { useParams, Navigate } from "react-router-dom";

/**
 * 301-style client redirect for legacy /creator/* URLs to /blogs/*.
 * Combined with prerender.io serving prerendered HTML to bots, this consolidates
 * duplicate URLs that previously caused Google "Soft 404" and "Duplicate without
 * user-selected canonical" errors.
 *
 * For bots that follow the canonical tag emitted by the destination /blogs/* page,
 * this fully resolves indexing of the canonical URL.
 */
type Props = { type: "creator" | "post" | "video" };

const LegacyCreatorRedirect = ({ type }: Props) => {
  const { creatorSlug, postSlug, videoSlug } = useParams();

  if (!creatorSlug) {
    return <Navigate to="/blogs" replace />;
  }

  let to = `/blogs/${creatorSlug}`;
  if (type === "post" && postSlug) {
    to = `/blogs/${creatorSlug}/${postSlug}`;
  } else if (type === "video" && postSlug && videoSlug) {
    to = `/blogs/${creatorSlug}/${postSlug}/${videoSlug}`;
  }

  return <Navigate to={to} replace />;
};

export default LegacyCreatorRedirect;
