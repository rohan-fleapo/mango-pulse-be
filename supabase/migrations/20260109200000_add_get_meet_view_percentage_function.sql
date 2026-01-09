CREATE OR REPLACE FUNCTION get_meet_view_percentage(p_meeting_id uuid)
RETURNS TABLE (
  bucket_start_min numeric,
  bucket_end_min numeric,
  view_percentage numeric
) AS $$
  WITH sessions AS (
    SELECT
      ma.user_id,
      EXTRACT(EPOCH FROM (ma.joining_time - m.start_date)) / 60 AS join_min,
      EXTRACT(
        EPOCH FROM (
          COALESCE(ma.leaving_time, m.end_date, m.scheduled_end_date)
          - m.start_date
        )
      ) / 60 AS leave_min
    FROM meeting_activities ma
    JOIN meetings m ON m.id = ma.meeting_id
    WHERE ma.meeting_id = p_meeting_id
  ),

  buckets AS (
    SELECT
      gs AS bucket_start_min,
      gs + 5 AS bucket_end_min
    FROM meetings m,
         generate_series(
           0,
           EXTRACT(
             EPOCH FROM (
               COALESCE(m.end_date, m.scheduled_end_date) - m.start_date
             )
           ) / 60 - 5,
           5
         ) gs
    WHERE m.id = p_meeting_id
  ),

  total_users AS (
    SELECT COUNT(DISTINCT user_id) AS total_users
    FROM sessions
  )

  SELECT
    b.bucket_start_min,
    b.bucket_end_min,
    ROUND(
      (COUNT(DISTINCT s.user_id)::numeric / NULLIF(tu.total_users, 0)) * 100,
      2
    ) AS view_percentage
  FROM buckets b
  LEFT JOIN sessions s
    ON s.join_min < b.bucket_end_min
   AND s.leave_min > b.bucket_start_min
  CROSS JOIN total_users tu
  GROUP BY
    b.bucket_start_min,
    b.bucket_end_min,
    tu.total_users
  ORDER BY b.bucket_start_min;
$$ LANGUAGE sql;
