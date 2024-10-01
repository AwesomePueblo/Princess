public with sharing class OpportunityRelatedListController {
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getRelatedOpportunities(Id accountId, String fields) {
        try {
            if (String.isBlank(fields)) {
                fields = 'Id,Name,StageName,Amount,CloseDate,RecordTypeId';
            }
            
            // Ensure Id and RecordTypeId are always included
            if (!fields.containsIgnoreCase('Id')) {
                fields = 'Id,' + fields;
            }
            if (!fields.containsIgnoreCase('RecordTypeId')) {
                fields += ',RecordTypeId';
            }
            
            String query = 'SELECT ' + fields + 
                           ' FROM Opportunity ' +
                           'WHERE AccountId = :accountId ' +
                           'ORDER BY CloseDate ASC';
            
            System.debug('Query: ' + query);
            List<Opportunity> opportunities = Database.query(query);
            System.debug('Opportunities found: ' + opportunities.size());
            
            // Get all unique RecordTypeIds from the opportunities
            Set<Id> recordTypeIds = new Set<Id>();
            for (Opportunity opp : opportunities) {
                recordTypeIds.add(opp.RecordTypeId);
            }
            
            // Get stage name picklist values
            List<String> stageNames = new List<String>();
            Schema.DescribeFieldResult fieldResult = Opportunity.StageName.getDescribe();
            List<Schema.PicklistEntry> picklistValues = fieldResult.getPicklistValues();
            for (Schema.PicklistEntry entry : picklistValues) {
                if (entry.isActive()) {
                    stageNames.add(entry.getValue());
                }
            }
            
            System.debug('Stage Names: ' + stageNames);
            
            return new Map<String, Object>{
                'opportunities' => opportunities,
                'stageNameOptions' => stageNames
            };
        } catch (Exception e) {
            System.debug('Error in getRelatedOpportunities: ' + e.getMessage() + '\n' + e.getStackTraceString());
            throw new AuraHandledException('Error fetching opportunities: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void updateOpportunities(List<Map<String, Object>> opportunitiesToUpdate) {
        try {
            List<Opportunity> oppsToUpdate = new List<Opportunity>();
            for (Map<String, Object> oppMap : opportunitiesToUpdate) {
                Map<String, Object> fields = (Map<String, Object>)oppMap.get('fields');
                Opportunity opp = new Opportunity(Id = (Id)fields.get('Id'));
                for (String field : fields.keySet()) {
                    if (field != 'Id') {
                        opp.put(field, fields.get(field));
                    }
                }
                oppsToUpdate.add(opp);
            }
            update oppsToUpdate;
        } catch (Exception e) {
            System.debug('Error in updateOpportunities: ' + e.getMessage() + '\n' + e.getStackTraceString());
            throw new AuraHandledException('Error updating opportunities: ' + e.getMessage());
        }
    }
}