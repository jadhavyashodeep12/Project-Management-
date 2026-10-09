from marshmallow import Schema, fields, validate

class RegisterRequestSchema(Schema):
    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.Str(required=True, validate=validate.Length(min=8, max=100))
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))

class LoginRequestSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)

class UserResponseSchema(Schema):
    id = fields.Int()
    email = fields.Email()
    first_name = fields.Str()
    last_name = fields.Str()
    full_name = fields.Str()
    role_id = fields.Int()
    role_code = fields.Str()
    created_at = fields.DateTime()

