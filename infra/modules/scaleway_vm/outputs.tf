output "instance_id" {
  description = "Instance ID"
  value       = scaleway_instance_server.vm.id
}

output "public_ip" {
  description = "Public IP address"
  value       = scaleway_instance_server.vm.public_ip
}

output "ssh_username" {
  description = "SSH username"
  value       = var.ssh_username
}

output "ssh_password" {
  description = "SSH password"
  value       = local.ssh_password
  sensitive   = true
}

output "instance_name" {
  description = "Instance name"
  value       = scaleway_instance_server.vm.name
}

output "zone" {
  description = "Zone"
  value       = scaleway_instance_server.vm.zone
}

output "status" {
  description = "Instance status"
  value       = scaleway_instance_server.vm.state
}
