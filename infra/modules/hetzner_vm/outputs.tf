output "instance_id" {
  description = "Instance ID"
  value       = hcloud_server.vm.id
}

output "public_ip" {
  description = "Public IP address"
  value       = hcloud_server.vm.ipv4_address
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
  value       = hcloud_server.vm.name
}

output "location" {
  description = "Location"
  value       = hcloud_server.vm.location
}

output "status" {
  description = "Instance status"
  value       = hcloud_server.vm.status
}
