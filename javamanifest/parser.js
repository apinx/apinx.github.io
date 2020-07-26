
function readBlob(blob) {
    if(blob.name.indexOf('.jar') >= 0) {
        zip.workerScriptsPath = "lib/";

        zip.createReader(new zip.BlobReader(blob), function(reader) {
            // get all entries from the zip
            reader.getEntries(function(entries) {
          
            for(var i = 0; i < entries.length; i++) {
                if(entries[i].filename.toLowerCase().indexOf('manifest.mf') >= 0) {
                    // get first entry content as text
                    entries[i].getData(new zip.TextWriter(), function(text) {
                        // text contains the entry data as a String
                        //console.log(text);
                        onOrg(text);
                        onText(text);

                        // close the zip reader
                        reader.close(function() {
                        // onclose callback
                        });

                    }, function(current, total) {
                        //console.log('Progress: ' + current + " / "+total);
                    });
                    break;
                }
            }

           
              
            });
          }, function(error) {
            console.log(error);
          });

    } else {
        var reader = new FileReader();
        reader.onload = function() {
            onOrg(reader.result);
            onText(reader.result);
        }
        reader.readAsText(blob);
    }

}

function onOrg(text) {
    var shower = document.getElementById('org');
    shower.value = text;
}

function tokenizer(line, callback) {
    var accum = '';
    var accumUntilNextQuote = false;
    var inBrackets = false;
    for(var i = 0; i < line.length; i++) {
        var char = line.charAt(i);
        var peak = i + 1 < line.length ? line.charAt(i+1) : undefined;
        var peak2 = i + 2 < line.length ? line.charAt(i+2) : undefined;

        if(char === '[' || char === '(') {
            inBrackets = true;
        } else if(char === ']' || char === ')') {
            inBrackets = false;
        }

        if(accumUntilNextQuote && char === '"') {
            callback(accum, peak);
            accum = '';
            accumUntilNextQuote = false;
            i++;
        } else if(char === ';' || char === ',' || char === '"') {
            if(char !== ',' || !inBrackets) {
                callback(accum, char);
                accum = '';
            } else {
                accum += char;

            }
        } else if(char === ':' && peak === '=') {
            if(peak2 === '"') {
                callback(accum, ':="');
                accum = '';
                i+=2;
            } else {
                accum += ':=';
                i+=1; 
            }
        
        } else if(char === '=' && peak === '"') {
            accumUntilNextQuote = true;
            accum += char;
            i++;
        } else {
            accum += char;
        }
    }

    if(accum.length > 0) {
        callback(accum, undefined);
    }
}

function AstBuilder() {
    var root = {parent: undefined, children:[], attributes: []};
    function addNode(parent, name) {
        var node = {parent: parent, children:[], attributes: [], name:name};
        parent.children.push(node);
        return node;
    }

    //console.log("new AstBuilder")

    function pushAttribute(node, v) {
        if(v !== undefined && v.length > 0) {
            node.attributes.push(v);
        }
    }

    var currentNode = addNode(root);
    function doWork(token, seperator) {
        //console.log({Token: token, Seperator: seperator});

        switch(seperator) {
            case ';':
                pushAttribute(currentNode, token);
                break;
            case ',':
                pushAttribute(currentNode, token);
                //console.log(" Adding sibling");
                currentNode = addNode(currentNode.parent, currentNode.name);
                break;
            case ':="':
                currentNode = addNode(currentNode, token);
                //console.log(" Adding child");
                break;
            case ':=':
                pushAttribute(currentNode, token);
                //console.log(" Adding child");
                break;
            case '"':
                pushAttribute(currentNode, token);
                //console.log(" Going to parent");
                currentNode = currentNode.parent;
                break;
            case undefined:
                pushAttribute(currentNode, token);
                break;
        }
    }

    function domPrint(key, element, node, level) {
        if(key !== undefined) {
            element.innerHTML += '<b>' +key+ '</b>:';
            if(node.attributes.length === 0 
                && node.children.length === 1 
                && node.children[0].children.length === 0 
                && node.children[0].attributes.length === 1) {
                    element.innerHTML += ' '+node.children[0].attributes[0] + '<br/>';
                return;
            }
        }

        for(var i = 0; i < level; i++) {
            element.innerHTML += '&nbsp;&nbsp;';
        }
        if(i > 1) {
            if(node.name === undefined) {
                element.innerHTML += '&nbsp; - ';
            } else {
                element.innerHTML += '&nbsp; '+node.name+' ';

            }
        }
        
        element.innerHTML += (node.attributes.join(', ').trim()+'<br/>');

        node.children.forEach(function(child) {
            domPrint(undefined, element, child, level+1);
        });
    }

    return {
        input: doWork,
        print: function(key, element) {
            //console.log(root);
            domPrint(key, element, root, 0);
        }
    }
}

function onKeyUp() {
    onText(document.getElementById('org').value);
}

function onText(text) {
    var shower = document.getElementById('shower');

    function handleLine(line) {
        var keyIdx = line.indexOf(':');
            if(keyIdx >= 0) {
                var key = line.substring(0, keyIdx).trim();
                var value = line.substring(keyIdx+1).trim();

                var astBuilder = new AstBuilder();
                tokenizer(value, astBuilder.input);
                astBuilder.print(key, shower);
            } else {
                shower.innerHTML += line + '<br/>';
            }
    }

    shower.innerHTML = "";
    var spl = text.split('\n');
    var section = undefined;
    for(var idx in spl) {
        var currentLine = spl[idx].replace('\r', '');
        if(currentLine.charAt(0) === ' ') {
            section += currentLine.substring(1);
        } else {
            if(section !== undefined) {
                handleLine(section); 
            }
            section = currentLine;
        }
    }
    handleLine(section);
}

function dropHandler(ev) {
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        readBlob(file);
    
      }
    }
  } else {
    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
      readBlob(ev.dataTransfer.files[i]);
    }
  }
}


function dragOverHandler(ev) {
  ev.preventDefault();
}