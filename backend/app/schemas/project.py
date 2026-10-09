from marshmallow import Schema, fields, validate

class ProjectResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    key = fields.Str(dump_only=True)
    name = fields.Str(dump_only=True)
    description = fields.Str(dump_only=True)
    owner_id = fields.Int(dump_only=True)
    manager_id = fields.Int(dump_only=True, allow_none=True)
    status = fields.Str(dump_only=True)
    start_date = fields.Date(dump_only=True)
    end_date = fields.Date(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class ProjectCreateRequestSchema(Schema):
    key = fields.Str(
        required=True,
        validate=[
            validate.Length(min=2, max=10),
            validate.Regexp(r'^[a-zA-Z0-9]+$', error="Key must be alphanumeric only")
        ]
    )
    name = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    description = fields.Str(load_default=None, validate=validate.Length(max=1000))
    manager_id = fields.Int(load_default=None, allow_none=True)
    start_date = fields.Date(load_default=None)
    end_date = fields.Date(load_default=None)

class ProjectUpdateRequestSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=150))
    description = fields.Str(validate=validate.Length(max=1000))
    manager_id = fields.Int(allow_none=True)
    status = fields.Str(validate=validate.OneOf(['active', 'archived']))
    start_date = fields.Date()
    end_date = fields.Date()

class AssignManagerRequestSchema(Schema):
    manager_id = fields.Int(required=False, allow_none=True)


class AddMemberRequestSchema(Schema):
    user_id = fields.Int(required=True)
    role_id = fields.Int(required=True)

class ProjectMemberResponseSchema(Schema):
    id = fields.Int()
    email = fields.Str()
    first_name = fields.Str()
    last_name = fields.Str()
    full_name = fields.Str()
    role_id = fields.Int(allow_none=True)
    role_name = fields.Str(allow_none=True)
    role_code = fields.Str(allow_none=True)

