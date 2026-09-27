-- Insert sample creator blog post
INSERT INTO blog_posts (
  title,
  subtitle,
  content_html,
  slug,
  status,
  read_time_minutes,
  creator_name,
  creator_slug,
  creator_channel_url,
  creator_profile_image,
  creator_short_bio,
  creator_subscribers,
  featured_youtube_url,
  thumbnail_url
) VALUES (
  'How Tom Kuzmich Is Turning Classic Songs into Mini-Movies',
  'Tom Kuzmich blends vintage footage, cinematic editing and human moments to build music videos that feel more like short films than promos — and audiences are falling into the story.',
  '<h2>Meet Tom Kuzmich — the mini-movie auteur of YouTube</h2>
  <p>Tom Kuzmich calls his work "MINI-MOVIES" for a reason. Instead of quick-cut music promos, his latest uploads — beautiful, slow-paced, and meticulously edited — read like short films set to classic songs. On a channel of 2.35M subscribers, Tom''s approach is simple and powerful: marry timeless songs with emotionally charged visuals and let two minutes of cinema do the rest.</p>
  
  <h3>Featured: New Kids On the Block — I''ll Be Loving You (Forever)</h3>
  <p>This video is a textbook example of Tom''s strengths — warm, tactile cinematography, slow editing beats that let emotion breathe, and a narrative that invites the viewer into a private moment.</p>
  
  <h3>The craft: sequencing, pacing and the art of the quiet cut</h3>
  <p>What makes Tom''s mini-movies addictive is rhythm. He edits like a storyteller — not a list editor — finding beats where music and gesture meet. That slow pacing is a magnet for retention: viewers don''t just watch one scene, they stay to see the emotional turn. For creators, the lesson is clear: storytelling trumps flashy effects.</p>',
  'how-tom-kuzmich-is-turning-classic-songs-into-mini-movies',
  'published',
  5,
  'Tom Kuzmich',
  'tom-kuzmich',
  'https://youtube.com/@tomkuzmich',
  'https://yt3.googleusercontent.com/ytc/AOPolaQRj9TfGXLKd5Yw3hVTLGPVLGLqTjp7qK8gVqGr=s176-c-k-c0x00ffffff-no-rj',
  'Creator of mini-movie music videos with 2.35M subscribers. Specializing in cinematic storytelling through classic songs.',
  2350000,
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://images.unsplash.com/photo-1��511192250-1537e80b9def?w=800'
) ON CONFLICT (slug) DO NOTHING;