"use client";

import React, { useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  location: {
    address: string;
    city: string;
    district: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  reporter?: {
    firstName: string;
    lastName: string;
  };
}

interface MapComponentProps {
  issues: Issue[];
}

const MapComponent: React.FC<MapComponentProps> = ({ issues }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const initializeMap = async () => {
      try {
        // Dynamically import Leaflet
        const L = (await import('leaflet')).default;
        
        // Fix marker icons issue
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        if (!mapRef.current) return;

        // Clear existing map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        // Initialize map
        const map = L.map(mapRef.current).setView([19.0760, 72.8777], 11); // Mumbai coordinates

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add markers for issues
        issues.forEach((issue) => {
          if (!issue.location.coordinates) return;

          const getStatusColor = (status: string) => {
            switch (status) {
              case 'pending': return '#eab308'; // yellow
              case 'acknowledged': return '#3b82f6'; // blue
              case 'in_progress': return '#8b5cf6'; // purple
              case 'resolved': return '#22c55e'; // green
              case 'rejected': return '#ef4444'; // red
              default: return '#6b7280'; // gray
            }
          };

          // Create custom marker
          const marker = L.circleMarker([issue.location.coordinates.lat, issue.location.coordinates.lng], {
            radius: 8,
            fillColor: getStatusColor(issue.status),
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(map);

          // Create popup content
          const popupContent = `
            <div style="padding: 8px; min-width: 250px;">
              <h3 style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${issue.title}</h3>
              <div style="margin-bottom: 8px;">
                <span style="background: ${getStatusColor(issue.status)}20; color: ${getStatusColor(issue.status)}; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">${issue.status.replace('_', ' ')}</span>
                <span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 4px;">${issue.priority}</span>
              </div>
              <p style="margin-bottom: 4px; font-size: 12px;"><strong>Category:</strong> ${issue.category}</p>
              <p style="margin-bottom: 4px; font-size: 12px;"><strong>Location:</strong> ${issue.location.address}</p>
              <p style="margin-bottom: 4px; font-size: 12px;"><strong>Reporter:</strong> ${issue.reporter?.firstName || ''} ${issue.reporter?.lastName || ''}</p>
              <p style="margin-bottom: 8px; font-size: 12px; color: #6b7280;">${issue.description.substring(0, 100)}${issue.description.length > 100 ? '...' : ''}</p>
              <a href="/admin/issues/${issue._id}" style="display: inline-block; background: #16a34a; color: white; padding: 4px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;">View Details</a>
            </div>
          `;

          marker.bindPopup(popupContent);
          markersRef.current.push(marker);
        });

        // Fit map to show all markers
        if (issues.length > 0) {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds().pad(0.1));
        }

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [issues]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[600px] rounded-lg"
      style={{ zIndex: 1 }}
    />
  );
};

export default MapComponent;