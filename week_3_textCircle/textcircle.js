// this collection stores all the documents
this.Documents = new Mongo.Collection("documents");
// this collection stores sets of users that are editing documents
EditingUsers = new Mongo.Collection("editingUsers");


if (Meteor.isClient) {
  Meteor.subscribe("documents");
  Meteor.subscribe("editingUsers");
  // return the id of the first document you can find
  Template.editor.helpers({

    docid:function(){
      setupCurrentDocument();
      return Session.get("docid");
    },
    // configure the CodeMirror editor
    config:function(){
      return function(editor){
        editor.setOption("lineNumbers", true);
        editor.setOption("theme", "cobalt");
        // set a callback that gets triggered whenever the user
        // makes a change in the code editing window
        editor.on("change", function(cm_editor, info){
          // send the current code over to the iframe for rendering
          $("#viewer_iframe").contents().find("html").html(cm_editor.getValue());
          Meteor.call("addEditingUser");
        });
      }
    },
  });

  Template.navbar.helpers({
    documents:function(){
      return Documents.find();
    }
  });

  Template.docMeta.helpers({
    document:function(){
      return Document.findone({
        _id:Session.get("docid")
      });
    },
    canEdit:function(){
      var doc;
      doc = documents.findone({_id:Session.get("docid")});
      if(doc){
        if (doc.owner == Meteor.userId){
          return true;
        }
      }
      return false;
    }
  });

  Template.editableText.helpers({
    userCanEdit:function(doc, Collection){
      // user can edit the title if current doc is owned by the user.
      doc = Documents.findOne({
        _id:Session.get("docid"),
        owner:Meteor.userId()
      });
      if(doc){
        return true;
      }else{
        return false;
      }
    }
  });

  Template.editingUsers.helpers({
    // retrieve a set of users that are editing this document
    users:function(){
      var doc, eusers, users;
      doc = Documents.findOne();
      if (!doc){return;}// give up
      eusers = EditingUsers.findOne({docid:doc._id});
      if (!eusers){return;}// give up
      users = new Array();
      var i = 0;
      for (var user_id in eusers.users){
          users[i] = fixObjectKeys(eusers.users[user_id]);
          i++;
      }
      return users;
    }
  });


  ////////
  //EVENTS
  ///////
  Template.docMeta.events({
      "click .js-tog-private":function(){
        console.log(even.target.checked);
        var doc = {_id:Session.get("docid"), isPrivate:event.target.checked};
        Meteor.call("updateDocPrivacy", doc);

      }
  });

  Template.navbar.events({
    "click .js-add-doc":function(event){
      event.preventDefault();
      console.log("Add a new doc!");
      if(!Meteor.user()){ // user not log in
        alert("Please log in first!");
      }else{
        //logged in ,do something else
        var id = Meteor.call("addDoc", function(err, res){
          if (!err){
            // all good no errors!
            console.log("event callback received id: "+res);
            Session.set("docid", res);

          }
        });
        // async, so we dont need this, exec too fast, can't get id
        // use above instead
        // console.log("event got an id back: "+id);

      }
    },
    "click js-load-doc":function(){
      console.log(this);
      Session.set("docid", this._id);
    }
  });
}// end isClient...

if (Meteor.isServer) {
  Meteor.startup(function () {
    // insert a document if there isn't one already
    if (!Documents.findOne()){// no documents yet!
        Documents.insert({title:"my new document"});
    }
  });

  Meteor.publish("documents", function(){
    return Documents.find({
      $or: [
        {isPrivate:false},
        {owner:this.userId}
      ]
    });
  });

  Meteor.publish("editingUsers", function(){
    return EditingUsers.find();
  });
}

// methods that provide write access to the data
Meteor.methods({
  // allows changes to the editing users collection
  addEditingUser:function(){
    var doc, user, eusers;
    doc = Documents.findOne();
    if (!doc){return;}// no doc give up
    if (!this.userId){return;}// no logged in user give up
    // now I have a doc and possibly a user
    user = Meteor.user().profile;
    eusers = EditingUsers.findOne({docid:doc._id});
    if (!eusers){// no editing users have been stored yet
      eusers = {
        docid:doc._id,
        users:{},
      };
    }
    user.lastEdit = new Date();
    eusers.users[this.userId] = user;
    // upsert- insert or update if filter matches
    EditingUsers.upsert({_id:eusers._id}, eusers);
  },

  updateDocPrivacy:function(){
    // test
    console.log("updateDocPrivacy method");
    console.log(doc);
    var realDoc = Documents.findOne({_id = doc._id}, owner: this.userId);
    if (realDoc){
      realDoc.isPrivate = doc.isPrivate;
      Documents.update({_id = doc._id}, realDoc);
    }else{

    }
  },

  addDoc:function(){
    var doc;
    if(!this.userId){
      return;
    }else{
      doc = {
        owner: this.userId,
        createOn: new Date(),
        title: "my new document"

      };
      var id = Documents.insert(doc);
      console.log("addDoc method: got an id "+ id);
      return id;
    }
  }
})

// this renames object keys by removing hyphens to make the compatible
// with spacebars.
function fixObjectKeys(obj){
  var newObj = {};
  for (key in obj){
    var key2 = key.replace("-", "");
    newObj[key2] = obj[key];
  }
  return newObj;
}


function setupCurrentDocument(){
  var doc;
  if(!Session.get("docid")){// no doc id set
    doc = Documents.findOne();
    if (doc){
      Session.set("docid", doc._id);

    }
  }
}
