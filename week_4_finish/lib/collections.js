// documents collection
this.Documents = new Mongo.Collection("documents");
// editing users collection
EditingUsers = new Mongo.Collection("editingUsers");
// comments collection
Comments = new Mongo.C ollection("comments");

Comments.attachSchema(new SimpleSchema({
    title: {
        type: String,
        label: "Title",
        max: 200
    },
    body: {
        type: String,
        label: "Comment",
        max: 1000
    },
    docid: {
        type: String,
    },
    owner: {
        type: String,
    },

}));
