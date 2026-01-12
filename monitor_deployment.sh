#!/bin/bash
# Monitor GitHub Actions deployment until completion

RUN_ID="20918976017"
REPO="twgallo13/ROPI-V2.1"

echo "🔍 Monitoring deployment: https://github.com/$REPO/actions/runs/$RUN_ID"
echo ""

while true; do
  STATUS=$(gh run view $RUN_ID --repo $REPO --json status,conclusion --jq '{status: .status, conclusion: .conclusion}')
  CURRENT_STATUS=$(echo "$STATUS" | jq -r '.status')
  CONCLUSION=$(echo "$STATUS" | jq -r '.conclusion')
  
  if [ "$CURRENT_STATUS" = "completed" ]; then
    echo ""
    echo "======================================"
    if [ "$CONCLUSION" = "success" ]; then
      echo "✅ DEPLOYMENT SUCCESSFUL"
      echo "======================================"
      echo ""
      echo "Staging URL: https://ropi-aoss-staging.web.app"
      echo ""
      echo "Next steps:"
      echo "1. Test product save at: https://ropi-aoss-staging.web.app/product/104-TEST"
      echo "2. Login as: theo@shiekh.com"
      echo "3. Click 'Save' and verify document created as products/104-TEST"
      exit 0
    else
      echo "❌ DEPLOYMENT FAILED: $CONCLUSION"
      echo "======================================"
      echo ""
      echo "View logs: https://github.com/$REPO/actions/runs/$RUN_ID"
      gh run view $RUN_ID --repo $REPO --log-failed
      exit 1
    fi
  fi
  
  echo -ne "⏳ Status: $CURRENT_STATUS\r"
  sleep 10
done
