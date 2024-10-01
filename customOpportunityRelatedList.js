import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getRelatedOpportunities from '@salesforce/apex/OpportunityRelatedListController.getRelatedOpportunities';
import updateOpportunities from '@salesforce/apex/OpportunityRelatedListController.updateOpportunities';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CustomOpportunityRelatedList extends LightningElement {
    @api recordId;
    @api customFields = 'Name,StageName,Amount,CloseDate';
    @track columns = [];
    @track opportunities = [];
    @track draftValues = [];

    wiredOpportunitiesResult;

    connectedCallback() {
        this.initializeColumns();
    }

    initializeColumns() {
        const fields = this.customFields.split(',').map(field => field.trim());
        this.columns = fields.map(field => {
            let type = 'text';
            let editable = true;
            let typeAttributes = {};

            if (field === 'Amount') type = 'currency';
            if (field === 'CloseDate') type = 'date';
            if (field === 'StageName') {
                type = 'picklist';
                typeAttributes = {
                    placeholder: 'Choose Stage',
                    options: { fieldName: 'stageNameOptions' },
                    value: { fieldName: 'StageName' }
                };
            }

            return {
                label: this.formatLabel(field),
                fieldName: field,
                type: type,
                editable: editable,
                typeAttributes: typeAttributes
            };
        });
    }

    formatLabel(fieldName) {
        return fieldName.replace(/([A-Z])/g, ' $1').trim();
    }

    @wire(getRelatedOpportunities, { accountId: '$recordId', fields: '$customFields' })
    wiredOpportunities(result) {
        this.wiredOpportunitiesResult = result;
        if (result.data) {
            const opportunities = result.data.opportunities;
            const stageNameOptions = result.data.stageNameOptions;
            
            this.opportunities = opportunities.map(opp => ({
                ...opp,
                stageNameOptions: stageNameOptions
            }));

            console.log('Opportunities:', JSON.stringify(this.opportunities));
            console.log('Columns:', JSON.stringify(this.columns));
        } else if (result.error) {
            console.error('Error fetching opportunities:', JSON.stringify(result.error));
            this.showToast('Error', 'Error fetching opportunities: ' + result.error.body.message, 'error');
        }
    }

    handleSave(event) {
        const updatedFields = event.detail.draftValues.map(draft => {
            const fields = Object.assign({}, draft);
            return { fields };
        });

        updateOpportunities({ opportunitiesToUpdate: updatedFields })
            .then(() => {
                this.showToast('Success', 'Opportunities updated', 'success');
                this.draftValues = [];
                return refreshApex(this.wiredOpportunitiesResult);
            })
            .catch(error => {
                this.showToast('Error', 'Error updating opportunities: ' + error.body.message, 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant,
            }),
        );
    }
}