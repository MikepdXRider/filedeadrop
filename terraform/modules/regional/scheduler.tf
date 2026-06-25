# EventBridge Scheduler — one-time schedule per upload, fires at exactly T+24h
# to clean up S3 objects and DynamoDB records for files that were never accessed.
# The scheduler execution role holds the permission to invoke the expiry Lambda;
# the upload Lambda's role gets scheduler:CreateSchedule and iam:PassRole (iam.tf).

resource "aws_scheduler_schedule_group" "main" {
  name = "${var.env}-filedeadrop"
}

resource "aws_iam_role" "scheduler_exec" {
  name = "${var.env}-filedeadrop-scheduler-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "scheduler_invoke_expiry" {
  name = "${var.env}-filedeadrop-scheduler-invoke-expiry"
  role = aws_iam_role.scheduler_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = aws_lambda_function.expiry.arn
    }]
  })
}
