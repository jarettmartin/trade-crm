output "public_ip" {
  description = "Public static IP of the Lightsail instance. Point sprout-crm.com and api.sprout-crm.com A records here."
  value       = aws_lightsail_static_ip.this.ip_address
}

output "instance_name" {
  description = "Lightsail instance name."
  value       = aws_lightsail_instance.this.name
}

output "ssh_user" {
  description = "Default SSH user for the instance OS."
  value       = aws_lightsail_instance.this.username
}

output "ssh_command" {
  description = "SSH command to reach the instance (pass your private key via -i)."
  value       = "ssh -i <path-to-private-key> ${aws_lightsail_instance.this.username}@${aws_lightsail_static_ip.this.ip_address}"
}
