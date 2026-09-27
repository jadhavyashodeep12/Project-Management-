from marshmallow import Schema, fields, validate

class TeamResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(dump_only=True)
    description = fields.Str(dump_only=True)
    project_id = fields.Int(dump_only=True)
    lead_id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class TeamCreateRequestSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(load_default=None, validate=validate.Length(max=1000))
    project_id = fields.Int(required=True)
    lead_id = fields.Int(load_default=None)

class TeamUpdateRequestSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=1000))
    lead_id = fields.Int()

class TeamMemberRequestSchema(Schema):
    user_id = fields.Int(required=True)
