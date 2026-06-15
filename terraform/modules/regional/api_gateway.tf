# API Gateway — HTTP API that receives all client requests and routes them to
# the appropriate Lambda function. The Lambda authorizer runs before every
# route, enforcing the 10KB payload limit and the dev API key check. CORS is
# configured at the API level so preflight requests are handled without hitting
# Lambda. Upload gets its own tighter throttle (50 req/s dev, 100 req/s prod);
# all other routes share the default stage throttle. Access logs are written to
# CloudWatch in structured JSON for observability.

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.env}-filedeadrop-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.frontend_origins
    allow_methods = ["GET", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Content-Length", "x-api-key"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "lambda" {
  api_id                            = aws_apigatewayv2_api.main.id
  name                              = "${var.env}-lambda-authorizer"
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.authorizer.invoke_arn
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  identity_sources                  = []
}

resource "aws_apigatewayv2_integration" "upload" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.upload.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "view" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.view.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "delete" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.delete.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "upload" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /upload"
  target             = "integrations/${aws_apigatewayv2_integration.upload.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.lambda.id
}

resource "aws_apigatewayv2_route" "view" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /view/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.view.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.lambda.id
}

resource "aws_apigatewayv2_route" "delete" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /delete/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.delete.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.lambda.id
}

resource "aws_cloudwatch_log_group" "api_access_logs" {
  name              = "/aws/apigateway/${var.env}-filedeadrop"
  retention_in_days = 30
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access_logs.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      responseLength   = "$context.responseLength"
      responseLatency  = "$context.responseLatency"
      integrationError = "$context.integrationErrorMessage"
      errorMessage     = "$context.error.message"
      sourceIp         = "$context.identity.sourceIp"
      userAgent        = "$context.identity.userAgent"
    })
  }

  default_route_settings {
    throttling_rate_limit  = var.default_rate_limit
    throttling_burst_limit = var.default_burst_limit
  }

  route_settings {
    route_key              = aws_apigatewayv2_route.upload.route_key
    throttling_rate_limit  = var.upload_rate_limit
    throttling_burst_limit = var.upload_burst_limit
  }
}
