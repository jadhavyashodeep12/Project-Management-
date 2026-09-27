from marshmallow import Schema, fields, validate

class TaskCreateRequestSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    description = fields.Str(required=False, allow_none=True)
    priority = fields.Str(
        required=False, 
        validate=validate.OneOf(["low", "medium", "high", "urgent"]),
        load_default="medium"
    )
    type = fields.Str(
        required=False,
        validate=validate.OneOf(["task", "bug", "story", "epic"]),
        load_default="task"
    )
    column_id = fields.Int(required=False, allow_none=True)
    assignee_id = fields.Int(required=False, allow_none=True)
    due_date = fields.DateTime(required=False, allow_none=True)
    story_points = fields.Float(required=False, allow_none=True)
    estimate_hours = fields.Float(required=False, allow_none=True)

class TaskUpdateRequestSchema(Schema):
    title = fields.Str(required=False, validate=validate.Length(min=1, max=200))
    description = fields.Str(required=False, allow_none=True)
    status = fields.Str(required=False, validate=validate.OneOf(["todo", "in_progress", "in_review", "done"]))
    priority = fields.Str(required=False, validate=validate.OneOf(["low", "medium", "high", "urgent"]))
    type = fields.Str(required=False, validate=validate.OneOf(["task", "bug", "story", "epic"]))
    column_id = fields.Int(required=False, allow_none=True)
    assignee_id = fields.Int(required=False, allow_none=True)
    due_date = fields.DateTime(required=False, allow_none=True)
    story_points = fields.Float(required=False, allow_none=True)
    order_index = fields.Int(required=False)

class TaskUserResponseSchema(Schema):
    id = fields.Int()
    email = fields.Str()
    first_name = fields.Str()
    last_name = fields.Str()
    full_name = fields.Str()

class TaskResponseSchema(Schema):
    id = fields.Int()
    project_id = fields.Int()
    key = fields.Str()
    title = fields.Str()
    description = fields.Str()
    status = fields.Str()
    priority = fields.Str()
    type = fields.Str()
    story_points = fields.Float()
    due_date = fields.DateTime()
    column_id = fields.Int()
    creator_id = fields.Int()
    assignee_id = fields.Int()
    creator = fields.Nested(TaskUserResponseSchema)
    assignee = fields.Nested(TaskUserResponseSchema)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
