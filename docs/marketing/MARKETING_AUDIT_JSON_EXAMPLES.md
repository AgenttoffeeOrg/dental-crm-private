# 📊 MARKETING AUDIT MODULE - JSON EXAMPLES & API RESPONSES

## Complete Data Structures and Sample Outputs

---

## 1. AUDIT RUN RESULT (Complete JSON)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "practice_id": "practice_123",
  "domain": "smiledentalcare.com",
  "status": "completed",
  "run_type": "manual",
  "started_at": "2025-01-15T10:00:00Z",
  "completed_at": "2025-01-15T10:12:34Z",
  "duration_seconds": 154,
  
  "scores": {
    "composite": 78.4,
    "sub_scores": {
      "technical_seo": {
        "score": 85.2,
        "weight": 0.25,
        "weighted_contribution": 21.3
      },
      "local_presence": {
        "score": 72.0,
        "weight": 0.30,
        "weighted_contribution": 21.6
      },
      "content_authority": {
        "score": 60.5,
        "weight": 0.20,
        "weighted_contribution": 12.1
      },
      "analytics_hygiene": {
        "score": 88.0,
        "weight": 0.15,
        "weighted_contribution": 13.2
      },
      "conversion_ux": {
        "score": 92.0,
        "weight": 0.10,
        "weighted_contribution": 9.2
      }
    }
  },
  
  "benchmarking": {
    "peer_group_id": "peers_southwest_london",
    "peer_count": 12,
    "your_rank": 5,
    "percentile": 65.3,
    "gap_to_median": 3.2,
    "gap_to_top_3_avg": -14.1
  },
  
  "metrics": {
    "technical": {
      "core_web_vitals": {
        "lcp": 2.1,
        "fid": 45,
        "cls": 0.08,
        "assessment": "good"
      },
      "lighthouse": {
        "performance": 92,
        "accessibility": 88,
        "best_practices": 95,
        "seo": 100
      },
      "indexation": {
        "indexed_pages": 127,
        "submitted_pages": 134,
        "coverage_ratio": 94.8,
        "errors": 7,
        "warnings": 2
      },
      "https": true,
      "mobile_friendly": true,
      "has_sitemap": true
    },
    
    "local": {
      "gbp_completeness": 82.5,
      "reviews": {
        "total_count": 143,
        "avg_rating": 4.6,
        "last_30_days": 8,
        "response_rate": 91.2,
        "avg_response_time_hours": 14.2
      },
      "nap_consistency": 76.0,
      "citations": {
        "total_found": 32,
        "top_50_coverage": 64.0,
        "inconsistent": 4
      },
      "local_pack_appearances": 7
    },
    
    "content": {
      "authority_score": 42,
      "referring_domains": 38,
      "total_backlinks": 284,
      "toxic_backlinks_percent": 2.1,
      "content_freshness_score": 68,
      "indexed_pages": 127,
      "organic_keywords": 245
    },
    
    "analytics": {
      "ga4": {
        "connected": true,
        "custom_events": 12,
        "conversions": 4,
        "enhanced_measurement": true,
        "data_months": 18
      },
      "gsc": {
        "connected": true,
        "data_months": 24,
        "queries": 1847,
        "clicks": 3421
      },
      "utm_usage_rate": 68.4,
      "has_cookie_banner": true,
      "privacy_policy": true
    },
    
    "conversion": {
      "has_online_booking": true,
      "has_click_to_call": true,
      "phone_in_header": true,
      "contact_form_accessible": true,
      "mobile_responsive": true,
      "has_trust_signals": true,
      "ctas_above_fold": 3
    }
  },
  
  "recommendations": [
    {
      "id": "rec_001",
      "category": "local_presence",
      "title": "Increase Google Reviews Velocity",
      "description": "You're receiving 8 reviews per month. Top competitors average 25/month. Implement a systematic review request process.",
      "impact": "high",
      "effort": "medium",
      "confidence": "high",
      "estimated_hours": 4,
      "priority_score": 90,
      "current_value": 8,
      "target_value": 25,
      "evidence": [
        {
          "metric": "reviews_last_30_days",
          "source": "places_api",
          "value": 8
        }
      ],
      "action_steps": [
        "Set up automated email sequence post-appointment",
        "Train front desk staff on review requests",
        "Create SMS reminder 3 days after visit",
        "Monitor and respond to all new reviews within 24h"
      ]
    },
    {
      "id": "rec_002",
      "category": "technical_seo",
      "title": "Fix 7 Index Coverage Errors",
      "description": "Google Search Console reports 7 pages with indexation errors, primarily redirect chains and soft 404s.",
      "impact": "high",
      "effort": "low",
      "confidence": "high",
      "estimated_hours": 2,
      "priority_score": 95,
      "current_value": 127,
      "target_value": 134,
      "evidence": [
        {
          "metric": "gsc_coverage_errors",
          "source": "gsc",
          "value": 7,
          "url": "https://search.google.com/u/1/search-console?resource_id=..."
        }
      ],
      "action_steps": [
        "Review error report in GSC",
        "Fix redirect chains (simplify to single 301)",
        "Address soft 404 pages (add real content or remove)",
        "Submit sitemap after fixes",
        "Verify indexation within 7 days"
      ]
    },
    {
      "id": "rec_003",
      "category": "content_authority",
      "title": "Build 50 High-Quality Backlinks",
      "description": "You have 38 referring domains vs top 3 average of 127. Focus on local dental directories, health blogs, and partnerships.",
      "impact": "high",
      "effort": "high",
      "confidence": "medium",
      "estimated_hours": 40,
      "priority_score": 70,
      "current_value": 38,
      "target_value": 88,
      "evidence": [
        {
          "metric": "referring_domains",
          "source": "semrush",
          "value": 38
        }
      ],
      "action_steps": [
        "List 100 target websites (dental directories, health blogs, local news)",
        "Create linkable content (dental health guides, infographics)",
        "Outreach campaign to 20 sites per week",
        "Guest post on 2-3 health blogs per month",
        "Partner with local businesses for mutual links"
      ]
    },
    {
      "id": "rec_004",
      "category": "local_presence",
      "title": "Complete Missing NAP Citations",
      "description": "Found in 32 of top 50 directories. Missing from 18 key sources including Bing Places, Apple Maps, Healthgrades.",
      "impact": "medium",
      "effort": "medium",
      "confidence": "high",
      "estimated_hours": 6,
      "priority_score": 75,
      "current_value": 32,
      "target_value": 50,
      "evidence": [
        {
          "metric": "citation_coverage",
          "source": "brightlocal",
          "value": 64.0
        }
      ],
      "action_steps": [
        "Claim listings on Bing Places, Apple Maps",
        "Submit to Healthgrades, Zocdoc, RateMDs",
        "Ensure NAP 100% consistent across all",
        "Add practice to local chamber of commerce directory",
        "List on NHS Choices (if applicable)"
      ]
    },
    {
      "id": "rec_005",
      "category": "analytics_hygiene",
      "title": "Increase UTM Parameter Usage",
      "description": "Only 68% of campaign traffic is tagged with UTM parameters. This limits attribution accuracy.",
      "impact": "medium",
      "effort": "low",
      "confidence": "high",
      "estimated_hours": 3,
      "priority_score": 80,
      "current_value": 68.4,
      "target_value": 95.0,
      "evidence": [
        {
          "metric": "utm_usage_rate",
          "source": "ga4",
          "value": 68.4
        }
      ],
      "action_steps": [
        "Create UTM builder spreadsheet/tool",
        "Train marketing team on UTM standards",
        "Tag all social media posts with UTMs",
        "Tag all email campaigns with UTMs",
        "Set up GA4 report to monitor UTM compliance"
      ]
    }
  ],
  
  "competitors": [
    {
      "id": "comp_001",
      "name": "Smile Clinic Westminster",
      "domain": "smileclinicwestminster.co.uk",
      "place_id": "ChIJ...",
      "rank": 1,
      "scores": {
        "composite": 92.1,
        "technical": 88.0,
        "local": 95.2,
        "content": 89.0,
        "analytics": 92.0,
        "conversion": 96.0
      },
      "metrics": {
        "reviews_count": 487,
        "avg_rating": 4.9,
        "referring_domains": 142,
        "indexed_pages": 218
      }
    },
    {
      "id": "comp_002",
      "name": "Bright Dental SW1",
      "domain": "brightdentalsw1.com",
      "place_id": "ChIJ...",
      "rank": 2,
      "scores": {
        "composite": 88.3,
        "technical": 90.0,
        "local": 89.5,
        "content": 82.0,
        "analytics": 88.0,
        "conversion": 91.0
      },
      "metrics": {
        "reviews_count": 342,
        "avg_rating": 4.8,
        "referring_domains": 96,
        "indexed_pages": 167
      }
    }
  ],
  
  "alerts": [
    {
      "type": "regression",
      "severity": "warning",
      "title": "Local Presence Score Dropped 8 Points",
      "description": "Down from 80.1 to 72.0 since last audit (Dec 15). Primary cause: Review velocity declined from 15/month to 8/month.",
      "triggered_at": "2025-01-15T10:12:34Z"
    }
  ],
  
  "meta": {
    "api_calls": {
      "psi": 1,
      "gsc": 4,
      "ga4": 3,
      "places": 13,
      "semrush": 2
    },
    "api_costs_usd": 0.87,
    "processing_time_seconds": 154,
    "data_sources": ["psi", "gsc", "ga4", "places_api", "semrush"],
    "phase": "phase_3"
  }
}
```

---

## 2. PAGESPEED INSIGHTS API RESPONSE (SAMPLE)

```json
{
  "captchaResult": "CAPTCHA_NOT_NEEDED",
  "kind": "pagespeedonline#result",
  "id": "https://smiledentalcare.com/",
  "loadingExperience": {
    "id": "https://smiledentalcare.com/",
    "metrics": {
      "CUMULATIVE_LAYOUT_SHIFT_SCORE": {
        "percentile": 8,
        "distributions": [
          {"min": 0, "max": 100, "proportion": 0.87},
          {"min": 100, "max": 250, "proportion": 0.08},
          {"min": 250, "proportion": 0.05}
        ],
        "category": "FAST"
      },
      "FIRST_CONTENTFUL_PAINT_MS": {
        "percentile": 1200,
        "distributions": [
          {"min": 0, "max": 1800, "proportion": 0.82},
          {"min": 1800, "max": 3000, "proportion": 0.12},
          {"min": 3000, "proportion": 0.06}
        ],
        "category": "FAST"
      },
      "FIRST_INPUT_DELAY_MS": {
        "percentile": 45,
        "distributions": [
          {"min": 0, "max": 100, "proportion": 0.91},
          {"min": 100, "max": 300, "proportion": 0.06},
          {"min": 300, "proportion": 0.03}
        ],
        "category": "FAST"
      },
      "LARGEST_CONTENTFUL_PAINT_MS": {
        "percentile": 2100,
        "distributions": [
          {"min": 0, "max": 2500, "proportion": 0.78},
          {"min": 2500, "max": 4000, "proportion": 0.15},
          {"min": 4000, "proportion": 0.07}
        ],
        "category": "FAST"
      }
    },
    "overall_category": "FAST"
  },
  "lighthouseResult": {
    "requestedUrl": "https://smiledentalcare.com/",
    "finalUrl": "https://smiledentalcare.com/",
    "lighthouseVersion": "10.0.0",
    "userAgent": "Mozilla/5.0...",
    "fetchTime": "2025-01-15T10:05:23.123Z",
    "environment": {
      "networkUserAgent": "Mozilla/5.0...",
      "hostUserAgent": "Chrome/118.0.0.0",
      "benchmarkIndex": 1450
    },
    "runWarnings": [],
    "configSettings": {
      "emulatedFormFactor": "mobile",
      "locale": "en-GB",
      "onlyCategories": ["performance", "accessibility", "best-practices", "seo"]
    },
    "audits": {
      "largest-contentful-paint": {
        "id": "largest-contentful-paint",
        "title": "Largest Contentful Paint",
        "description": "Largest Contentful Paint marks the time...",
        "score": 0.92,
        "scoreDisplayMode": "numeric",
        "numericValue": 2100,
        "numericUnit": "millisecond",
        "displayValue": "2.1 s"
      },
      "first-contentful-paint": {
        "id": "first-contentful-paint",
        "title": "First Contentful Paint",
        "score": 0.95,
        "numericValue": 1200,
        "displayValue": "1.2 s"
      },
      "cumulative-layout-shift": {
        "id": "cumulative-layout-shift",
        "title": "Cumulative Layout Shift",
        "score": 0.98,
        "numericValue": 0.08,
        "displayValue": "0.08"
      }
    },
    "categories": {
      "performance": {
        "id": "performance",
        "title": "Performance",
        "score": 0.92,
        "auditRefs": [...]
      },
      "accessibility": {
        "id": "accessibility",
        "title": "Accessibility",
        "score": 0.88
      },
      "best-practices": {
        "id": "best-practices",
        "title": "Best Practices",
        "score": 0.95
      },
      "seo": {
        "id": "seo",
        "title": "SEO",
        "score": 1.0
      }
    }
  }
}
```

---

## 3. GOOGLE SEARCH CONSOLE API RESPONSE (SAMPLE)

```json
{
  "responseAggregationType": "auto",
  "rows": [
    {
      "keys": ["page"],
      "clicks": 3421,
      "impressions": 47892,
      "ctr": 0.0714,
      "position": 8.2
    }
  ]
}

// Index Coverage API
{
  "sitemap": [
    "https://smiledentalcare.com/sitemap.xml"
  ],
  "coverage": {
    "valid": {
      "count": 127,
      "examples": [
        "https://smiledentalcare.com/services/teeth-whitening",
        "https://smiledentalcare.com/services/implants"
      ]
    },
    "error": {
      "count": 7,
      "examples": [
        {
          "url": "https://smiledentalcare.com/old-page",
          "issue": "Redirect error",
          "details": "Redirect chain too long (5 hops)"
        },
        {
          "url": "https://smiledentalcare.com/blog/post-123",
          "issue": "Soft 404",
          "details": "Page returns 200 but has no substantial content"
        }
      ]
    },
    "warning": {
      "count": 2,
      "examples": [
        {
          "url": "https://smiledentalcare.com/services/emergency",
          "issue": "Indexed, though blocked by robots.txt",
          "details": "..."
        }
      ]
    }
  }
}
```

---

## 4. GA4 DATA API RESPONSE (SAMPLE)

```json
{
  "dimensionHeaders": [
    {"name": "sessionDefaultChannelGrouping"}
  ],
  "metricHeaders": [
    {"name": "sessions", "type": "TYPE_INTEGER"},
    {"name": "conversions", "type": "TYPE_INTEGER"}
  ],
  "rows": [
    {
      "dimensionValues": [{"value": "Organic Search"}],
      "metricValues": [
        {"value": "3847"},
        {"value": "42"}
      ]
    },
    {
      "dimensionValues": [{"value": "Direct"}],
      "metricValues": [
        {"value": "1923"},
        {"value": "18"}
      ]
    },
    {
      "dimensionValues": [{"value": "Paid Search"}],
      "metricValues": [
        {"value": "542"},
        {"value": "12"}
      ]
    }
  ],
  "rowCount": 8,
  "metadata": {
    "dataLossFromOtherRowOverflow": false
  },
  "propertyQuota": {
    "tokensPerDay": {"consumed": 124, "remaining": 24876},
    "tokensPerHour": {"consumed": 12, "remaining": 988}
  }
}
```

---

## 5. PLACES API RESPONSE (SAMPLE)

```json
{
  "result": {
    "place_id": "ChIJrTLr-GyuEmsRBfy61i59si0",
    "name": "Smile Dental Care",
    "formatted_address": "123 Harley Street, London W1G 6AX, UK",
    "formatted_phone_number": "+44 20 1234 5678",
    "rating": 4.6,
    "user_ratings_total": 143,
    "reviews": [
      {
        "author_name": "Sarah Johnson",
        "rating": 5,
        "text": "Excellent service! The team was professional...",
        "time": 1704672000,
        "relative_time_description": "2 weeks ago"
      },
      {
        "author_name": "David Smith",
        "rating": 4,
        "text": "Great experience overall. Dr. Ahmed was very thorough...",
        "time": 1703894400,
        "relative_time_description": "1 month ago"
      }
    ],
    "photos": [
      {
        "photo_reference": "ATtYBwI...",
        "height": 4032,
        "width": 3024
      }
    ],
    "business_status": "OPERATIONAL",
    "types": ["dentist", "health", "point_of_interest", "establishment"],
    "url": "https://maps.google.com/?cid=...",
    "website": "https://smiledentalcare.com",
    "opening_hours": {
      "open_now": true,
      "periods": [...]
    }
  },
  "status": "OK"
}

// Nearby Search for Competitors
{
  "results": [
    {
      "place_id": "ChIJ...",
      "name": "Bright Dental",
      "rating": 4.8,
      "user_ratings_total": 342
    },
    {
      "place_id": "ChIJ...",
      "name": "City Dentists",
      "rating": 4.7,
      "user_ratings_total": 267
    }
  ],
  "status": "OK",
  "next_page_token": "CqQC..."
}
```

---

## 6. BRIGHTLOCAL API RESPONSE (SAMPLE - PHASE 2)

```json
{
  "success": true,
  "location-id": 12345,
  "report": {
    "gbp_completeness": {
      "score": 82.5,
      "total_fields": 40,
      "completed_fields": 33,
      "missing_fields": [
        "business_description",
        "service_areas",
        "attributes.wifi_available",
        "attributes.parking_available",
        "opening_date",
        "photos.team_photos",
        "q_and_a"
      ]
    },
    "citations": {
      "total_found": 32,
      "top_50_coverage": 64.0,
      "consistent": 28,
      "inconsistent": 4,
      "missing": 18,
      "details": [
        {
          "directory": "Yelp",
          "status": "consistent",
          "url": "https://www.yelp.com/biz/..."
        },
        {
          "directory": "Bing Places",
          "status": "missing",
          "recommended_action": "Claim listing"
        },
        {
          "directory": "Healthgrades",
          "status": "inconsistent",
          "issue": "Phone number differs: +44 20 1234 5678 vs +44 20 9876 5432"
        }
      ]
    },
    "nap_consistency": {
      "score": 76.0,
      "name_variations": 2,
      "address_variations": 1,
      "phone_variations": 3
    },
    "local_pack_rankings": {
      "total_keywords": 10,
      "appearing_in_pack": 7,
      "avg_position_in_pack": 2.3,
      "keywords": [
        {"keyword": "dentist near me", "position": 2, "in_pack": true},
        {"keyword": "teeth whitening london", "position": null, "in_pack": false}
      ]
    }
  }
}
```

---

## 7. SEMRUSH API RESPONSE (SAMPLE - PHASE 3)

```json
{
  "domain": "smiledentalcare.com",
  "backlinks_overview": {
    "total_backlinks": 284,
    "referring_domains": 38,
    "referring_ips": 35,
    "authority_score": 42,
    "toxic_score": 2.1
  },
  "referring_domains_list": [
    {
      "domain": "healthnews.co.uk",
      "authority_score": 68,
      "backlinks": 3,
      "anchor_type": "text",
      "dofollow": true,
      "first_seen": "2024-08-15"
    },
    {
      "domain": "localdirectory.com",
      "authority_score": 32,
      "backlinks": 1,
      "anchor_type": "url",
      "dofollow": false,
      "first_seen": "2023-11-02"
    }
  ],
  "organic_keywords": {
    "total_keywords": 245,
    "top_10": 18,
    "top_20": 34,
    "top_100": 127,
    "keywords": [
      {
        "keyword": "teeth whitening london",
        "position": 8,
        "search_volume": 1200,
        "cpc": 3.45,
        "url": "https://smiledentalcare.com/services/teeth-whitening",
        "traffic_percent": 12.3
      },
      {
        "keyword": "dental implants harley street",
        "position": 4,
        "search_volume": 800,
        "cpc": 5.20,
        "url": "https://smiledentalcare.com/services/implants",
        "traffic_percent": 18.7
      }
    ]
  },
  "toxic_backlinks": [
    {
      "source_url": "http://spammy-site.xyz/links.html",
      "toxic_score": 89,
      "recommendation": "disavow"
    }
  ]
}
```

---

## 8. DATABASE INSERT EXAMPLES

```sql
-- Insert audit run
INSERT INTO marketing_audit_runs (
  id, practice_id, domain, status, composite_score,
  technical_score, local_score, content_score,
  analytics_score, conversion_score, percentile_rank,
  started_at, completed_at, tenant_id
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'practice_123',
  'smiledentalcare.com',
  'completed',
  78.4,
  85.2, 72.0, 60.5, 88.0, 92.0,
  65.3,
  '2025-01-15 10:00:00+00',
  '2025-01-15 10:12:34+00',
  'tenant_abc'
);

-- Insert metrics
INSERT INTO audit_metrics (
  run_id, category, metric_name, metric_value, metric_unit,
  source, raw_data, tenant_id
) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'technical', 'lcp', 2.1, 'seconds', 'psi', '{"full":"response"}', 'tenant_abc'),
  ('550e8400-e29b-41d4-a716-446655440000', 'technical', 'fid', 45, 'milliseconds', 'psi', '{"full":"response"}', 'tenant_abc'),
  ('550e8400-e29b-41d4-a716-446655440000', 'local', 'reviews_count', 143, 'count', 'places_api', '{"full":"response"}', 'tenant_abc'),
  ('550e8400-e29b-41d4-a716-446655440000', 'local', 'avg_rating', 4.6, 'rating', 'places_api', '{"full":"response"}', 'tenant_abc');

-- Insert recommendations
INSERT INTO audit_recommendations (
  run_id, category, title, description, impact, effort,
  confidence, estimated_hours, priority_score,
  status, tenant_id
) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'local_presence',
   'Increase Google Reviews Velocity',
   'You''re receiving 8 reviews per month. Top competitors average 25/month.',
   'high', 'medium', 'high', 4, 90, 'pending', 'tenant_abc'),
  ('550e8400-e29b-41d4-a716-446655440000', 'technical_seo',
   'Fix 7 Index Coverage Errors',
   'Google Search Console reports 7 pages with indexation errors.',
   'high', 'low', 'high', 2, 95, 'pending', 'tenant_abc');

-- Insert competitors
INSERT INTO audit_competitors (
  run_id, competitor_name, competitor_domain, competitor_place_id,
  composite_score, local_score, technical_score,
  metrics, tenant_id
) VALUES
  ('550e8400-e29b-41d4-a716-446655440000',
   'Smile Clinic Westminster',
   'smileclinicwestminster.co.uk',
   'ChIJ...',
   92.1, 95.2, 88.0,
   '{"reviews_count": 487, "avg_rating": 4.9}',
   'tenant_abc');
```

---

## 9. API CONNECTOR TYPESCRIPT INTERFACES

```typescript
// Audit Run Interface
interface AuditRun {
  id: string;
  practice_id: string;
  domain: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scores: {
    composite: number;
    sub_scores: {
      technical_seo: SubScore;
      local_presence: SubScore;
      content_authority: SubScore;
      analytics_hygiene: SubScore;
      conversion_ux: SubScore;
    };
  };
  benchmarking: BenchmarkData;
  metrics: AllMetrics;
  recommendations: Recommendation[];
  competitors: Competitor[];
  alerts: Alert[];
  meta: MetaData;
}

interface SubScore {
  score: number; // 0-100
  weight: number; // 0-1
  weighted_contribution: number;
}

interface Recommendation {
  id: string;
  category: 'technical_seo' | 'local_presence' | 'content_authority' | 'analytics_hygiene' | 'conversion_ux';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  estimated_hours: number;
  priority_score: number; // 0-100
  current_value?: number;
  target_value?: number;
  evidence: Evidence[];
  action_steps: string[];
  status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  task_id?: string;
  deal_id?: string;
}

interface Evidence {
  metric: string;
  source: 'psi' | 'gsc' | 'ga4' | 'places_api' | 'brightlocal' | 'semrush';
  value: number | string;
  url?: string;
  timestamp?: string;
}

interface Competitor {
  id: string;
  name: string;
  domain: string;
  place_id: string;
  rank: number;
  scores: {
    composite: number;
    technical: number;
    local: number;
    content: number;
    analytics: number;
    conversion: number;
  };
  metrics: {
    reviews_count: number;
    avg_rating: number;
    referring_domains: number;
    indexed_pages: number;
  };
}

interface AllMetrics {
  technical: TechnicalMetrics;
  local: LocalMetrics;
  content: ContentMetrics;
  analytics: AnalyticsMetrics;
  conversion: ConversionMetrics;
}

interface TechnicalMetrics {
  core_web_vitals: {
    lcp: number; // seconds
    fid: number; // milliseconds
    cls: number; // score
    assessment: 'good' | 'needs_improvement' | 'poor';
  };
  lighthouse: {
    performance: number; // 0-100
    accessibility: number;
    best_practices: number;
    seo: number;
  };
  indexation: {
    indexed_pages: number;
    submitted_pages: number;
    coverage_ratio: number;
    errors: number;
    warnings: number;
  };
  https: boolean;
  mobile_friendly: boolean;
  has_sitemap: boolean;
}

interface LocalMetrics {
  gbp_completeness: number; // 0-100
  reviews: {
    total_count: number;
    avg_rating: number;
    last_30_days: number;
    response_rate: number;
    avg_response_time_hours: number;
  };
  nap_consistency: number; // 0-100
  citations: {
    total_found: number;
    top_50_coverage: number;
    inconsistent: number;
  };
  local_pack_appearances: number;
}

interface ContentMetrics {
  authority_score: number; // 0-100 (Semrush)
  referring_domains: number;
  total_backlinks: number;
  toxic_backlinks_percent: number;
  content_freshness_score: number;
  indexed_pages: number;
  organic_keywords: number;
}

interface AnalyticsMetrics {
  ga4: {
    connected: boolean;
    custom_events: number;
    conversions: number;
    enhanced_measurement: boolean;
    data_months: number;
  };
  gsc: {
    connected: boolean;
    data_months: number;
    queries: number;
    clicks: number;
  };
  utm_usage_rate: number; // 0-100
  has_cookie_banner: boolean;
  privacy_policy: boolean;
}

interface ConversionMetrics {
  has_online_booking: boolean;
  has_click_to_call: boolean;
  phone_in_header: boolean;
  contact_form_accessible: boolean;
  mobile_responsive: boolean;
  has_trust_signals: boolean;
  ctas_above_fold: number;
}

interface BenchmarkData {
  peer_group_id: string;
  peer_count: number;
  your_rank: number;
  percentile: number;
  gap_to_median: number;
  gap_to_top_3_avg: number;
}

interface MetaData {
  api_calls: Record<string, number>;
  api_costs_usd: number;
  processing_time_seconds: number;
  data_sources: string[];
  phase: 'phase_1' | 'phase_2' | 'phase_3';
}

interface Alert {
  type: 'regression' | 'achievement' | 'warning' | 'critical';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  triggered_at: string;
  acknowledged?: boolean;
}
```

---

## 10. REACT COMPONENT PROPS EXAMPLES

```typescript
// Overview Dashboard Component
interface AuditOverviewProps {
  auditRun: AuditRun;
  onCreateTask: (recommendation: Recommendation) => void;
  onRunNewAudit: () => void;
  onViewDeepDive: (category: string) => void;
}

// Evidence Card Component
interface EvidenceCardProps {
  metric: string;
  value: number | string;
  threshold: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
  source: string;
  sourceUrl?: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

// Competitor Benchmark Component
interface CompetitorBenchmarkProps {
  yourPractice: {
    name: string;
    score: number;
  };
  competitors: Competitor[];
  peerGroup: {
    id: string;
    name: string;
    count: number;
  };
  onEditPeerGroup: () => void;
}

// Recommendation Card Component
interface RecommendationCardProps {
  recommendation: Recommendation;
  onCreateTask: () => void;
  onViewDetails: () => void;
  onDismiss: () => void;
}
```

---

## 11. WEBHOOK PAYLOAD EXAMPLES

```json
{
  "event": "audit.completed",
  "timestamp": "2025-01-15T10:12:34Z",
  "practice_id": "practice_123",
  "audit_run_id": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "domain": "smiledentalcare.com",
    "composite_score": 78.4,
    "previous_score": 75.2,
    "delta": 3.2,
    "percentile_rank": 65.3,
    "top_recommendations": [
      {
        "title": "Fix 7 Index Coverage Errors",
        "impact": "high",
        "effort": "low"
      }
    ]
  }
}

{
  "event": "audit.regression_detected",
  "timestamp": "2025-01-15T10:12:34Z",
  "practice_id": "practice_123",
  "audit_run_id": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "category": "local_presence",
    "previous_score": 80.1,
    "current_score": 72.0,
    "delta": -8.1,
    "cause": "Review velocity declined from 15/month to 8/month"
  }
}
```

---

**This document provides complete JSON structures for all audit components, enabling rapid API integration and frontend development.**

**Next:** Implement Phase 0 prototype with PageSpeed Insights API connector.

