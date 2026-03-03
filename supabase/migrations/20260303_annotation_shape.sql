-- Sprint: Shape annotations linked to comments
-- Add support for storing annotation shapes (rect, circle, arrow, line, pen) with comments

ALTER TABLE comments ADD COLUMN IF NOT EXISTS annotation_shape JSONB;

-- Comment: JSONB structure example:
-- { "type": "rect", "color": "#ef4444", "x": 10, "y": 20, "width": 30, "height": 40 }
-- { "type": "circle", "color": "#ef4444", "x": 50, "y": 50, "width": 20, "height": 20 }
-- { "type": "arrow", "color": "#ef4444", "x": 10, "y": 10, "x2": 50, "y2": 50 }
-- { "type": "line", "color": "#ef4444", "x": 10, "y": 10, "x2": 50, "y2": 50 }
-- { "type": "pen", "color": "#ef4444", "points": [{"x":10,"y":10},{"x":20,"y":30}] }
-- All coordinates are percentages (0-100) relative to the image dimensions.
