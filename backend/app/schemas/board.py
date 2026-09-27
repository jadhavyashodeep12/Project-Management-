from marshmallow import Schema, fields

class ColumnResponseSchema(Schema):
    id = fields.Int()
    board_id = fields.Int()
    name = fields.Str()
    position = fields.Int()
    wip_limit = fields.Int(allow_none=True)
    color = fields.Str(allow_none=True)

class BoardResponseSchema(Schema):
    id = fields.Int()
    project_id = fields.Int()
    name = fields.Str()
    is_default = fields.Bool()
    columns = fields.List(fields.Nested(ColumnResponseSchema))
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
